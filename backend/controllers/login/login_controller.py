# backend/controllers/login/login_controller.py
from typing import Callable, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import os
import bcrypt
import jwt
from pymongo.database import Database
import logging

logger = logging.getLogger(__name__)

# Caché simple del objeto Database retornado por el get_db callable.
_DB_CACHE: Optional[Database] = None

# Configuración JWT (lee JWT_SECRET desde .env)
JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or os.environ.get('APP_SECRET')
JWT_ALGO = os.environ.get('JWT_ALGO', 'HS256')
try:
    JWT_EXP_MINUTES = int(os.environ.get('JWT_EXP_MINUTES', '60'))
except Exception:
    JWT_EXP_MINUTES = 60


class AuthError(ValueError):
    pass


def _ensure_db(db_or_callable: Union[Callable[[], Database], Database]) -> Database:
    """
    Asegura y retorna una instancia de Database.
    - Si se pasa una callable que resuelve la DB, la invoca solo la primera vez y cachea el resultado.
    - Si se pasa una instancia de Database la devuelve tal cual.
    - Lanza RuntimeError si no hay DB disponible.
    """
    global _DB_CACHE

    if _DB_CACHE is not None:
        return _DB_CACHE

    db = db_or_callable() if callable(db_or_callable) else db_or_callable

    if db is None:
        raise RuntimeError("Database no disponible (get_db_callable retornó None)")

    _DB_CACHE = db
    return db


def _serialize_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convierte el documento Mongo a un dict serializable, quitando password_hash
    y normalizando fechas y _id. Añade clave 'rol' intentando normalizar distintas convenciones.
    """
    if not doc:
        return doc
    result = dict(doc)
    result.pop("password_hash", None)
    result.pop("password", None)

    # Normalizar _id a string
    if "_id" in result:
        try:
            result["_id"] = str(result["_id"])
        except Exception:
            result["_id"] = result["_id"]

    # Normalizar fechas a ISO
    if isinstance(result.get("created_at"), datetime):
        result["created_at"] = result["created_at"].isoformat()
    if isinstance(result.get("last_login"), datetime):
        result["last_login"] = result["last_login"].isoformat()

    # Normalizar rol desde múltiples claves posibles
    rol = result.get("rol") or result.get("role") or result.get("roleName") or result.get("role_type") or result.get("perfil") or result.get("nivel")
    if rol is not None:
        result["rol"] = rol

    # Campos alternativos para compatibilidad con frontend
    if "usuario" in result and "name" not in result:
        result.setdefault("name", result.get("usuario"))
    if "email" in result:
        result.setdefault("email", result.get("email"))

    return result


def _normalize_search_key(key: str) -> str:
    """Normaliza la key usada para búsquedas por usuario_key."""
    return key.strip().lower()


def _determine_redirect_by_role(rol_value: Any) -> Optional[str]:
    """
    Normaliza el rol y devuelve la ruta de redirect sugerida:
    - administrador => /admin/dashboard
    - trabajador|empleado|worker => /trabajadores/inicio
    - cliente|user => /cliente/perfil
    """
    if rol_value is None:
        return None
    try:
        rol_norm = str(rol_value).lower()
    except Exception:
        rol_norm = ''
    if 'admin' in rol_norm or 'administrador' in rol_norm:
        return '/admin/dashboard'
    if 'trabajador' in rol_norm or 'empleado' in rol_norm or 'worker' in rol_norm:
        return '/trabajadores/inicio'
    if 'cliente' in rol_norm or 'user' in rol_norm or 'customer' in rol_norm:
        return '/cliente/perfil'
    return None


def _create_jwt_for_user(user_id: Any, rol_value: Any) -> Optional[str]:
    """
    Genera un JWT con reclamos mínimos: sub=user_id, rol, iat, exp.
    Devuelve None si no hay JWT_SECRET configurado.
    """
    secret = JWT_SECRET
    if not secret:
        logger.warning("JWT secret no configurado; no se generará token JWT")
        return None
    now = datetime.utcnow()
    try:
        payload = {
            "sub": str(user_id),
            "rol": str(rol_value) if rol_value is not None else "",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=JWT_EXP_MINUTES)).timestamp())
        }
        token = jwt.encode(payload, secret, algorithm=JWT_ALGO)
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        return token
    except Exception as exc:
        logger.exception("Error generando JWT: %s", exc)
        return None


def login_user(db_or_callable: Union[Callable[[], Database], Database], usuario_or_key: str, password: str) -> Dict[str, Any]:
    """
    Autentica usuario por usuario_key exacta (lowercase) o por campo usuario/email (case-insensitive).
    - Valida password usando bcrypt.checkpw.
    - Actualiza last_login al hacer login exitoso (update no bloquante).
    - Retorna dict con keys: user (serializado), redirect (ruta sugerida o None),
      token (JWT o None) y expiresIn (segundos) si aplica.
    - Lanza AuthError en fallos de autenticación o RuntimeError si DB no disponible.
    """
    if not usuario_or_key or not password:
        raise AuthError("Credenciales incompletas")

    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]

    key = usuario_or_key.strip()
    if not key:
        raise AuthError("Credenciales incompletas")

    # Intento 1: búsqueda por usuario_key normalizado (lowercase)
    search_key = _normalize_search_key(key)
    user_doc = usuarios_col.find_one({"usuario_key": search_key})

    # Intento 2: búsqueda por campo 'usuario' case-insensitive exacto
    if not user_doc:
        user_doc = usuarios_col.find_one({"usuario": {"$regex": f"^{key}$", "$options": "i"}})

    # Intento 3: búsqueda por email case-insensitive exacto
    if not user_doc:
        user_doc = usuarios_col.find_one({"email": {"$regex": f"^{key}$", "$options": "i"}})

    if not user_doc:
        raise AuthError("Usuario no encontrado")

    stored_hash = user_doc.get("password_hash") or user_doc.get("password")
    if not stored_hash:
        raise AuthError("Usuario no tiene contraseña válida")

    # Aceptar tanto bytes como str en stored_hash
    try:
        stored_hash_bytes = stored_hash.encode("utf-8") if isinstance(stored_hash, str) else stored_hash
    except Exception:
        stored_hash_bytes = stored_hash

    try:
        password_ok = bcrypt.checkpw(password.encode("utf-8"), stored_hash_bytes)
    except Exception as e:
        logger.exception("Error comprobando bcrypt: %s", e)
        raise AuthError("Credenciales inválidas") from e

    if not password_ok:
        raise AuthError("Credenciales inválidas")

    # Actualizamos last_login con timestamp UTC (no bloquear si falla)
    now = datetime.utcnow()
    try:
        usuarios_col.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login": now}})
        user_doc["last_login"] = now
    except Exception:
        logger.exception("No se pudo actualizar last_login (no crítico)")

    # Serializar user y preparar redirect/token
    serialized = _serialize_user(user_doc)
    rol = serialized.get("rol") or serialized.get("role") or serialized.get("roleName") or serialized.get("role_type") or serialized.get("perfil") or serialized.get("nivel") or ''
    redirect = _determine_redirect_by_role(rol)
    token = _create_jwt_for_user(serialized.get("_id") or user_doc.get("_id"), rol)

    # expiresIn en segundos para que el frontend lo guarde y sincronice
    try:
        expires_in_seconds = int(JWT_EXP_MINUTES) * 60 if JWT_EXP_MINUTES else None
    except Exception:
        expires_in_seconds = None

    # Respuesta estandarizada y consistente con lo que el frontend espera
    response = {
        "user": serialized,
        "redirect": redirect,
        "token": token,
    }
    if expires_in_seconds:
        response["expiresIn"] = expires_in_seconds

    return response
