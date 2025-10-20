# registrar_controller.py
"""
Controlador para registrar nuevos usuarios (registro público).
Funciones puras pensadas para ser invocadas desde endpoints Flask.
- register_user(get_db_callable, payload) -> dict (usuario creado sin password)
Valida contra models.usuarios_model.UsuarioCreate, asegura política de contraseña,
hashea con bcrypt y garantiza la unicidad de usuario_key.
"""
from typing import Callable, Dict, Any
from datetime import datetime
import re
import bcrypt
from pymongo.database import Database
from pydantic import ValidationError

from ...models.usuarios_model import UsuarioCreate
from bson import ObjectId

# Password policy: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un dígito y un carácter especial
PWD_POLICY_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")

class RegisterError(ValueError):
    pass

def _ensure_db(db_or_callable: Callable[[], Database] | Database) -> Database:
    if callable(db_or_callable):
        db = db_or_callable()
    else:
        db = db_or_callable
    if db is None:
        raise RuntimeError("Database no disponible (get_db_callable retornó None)")
    return db

def _hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

def _check_password_policy(password: str) -> None:
    if not PWD_POLICY_REGEX.match(password):
        raise RegisterError(
            "Password inseguro: mínimo 8 caracteres, incluir mayúscula, minúscula, dígito y carácter especial"
        )

def _normalize_user_key(usuario: str) -> str:
    return usuario.strip().lower()

def register_user(db_or_callable: Callable[[], Database] | Database, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Registra un nuevo usuario validando payload contra UsuarioCreate.
    - Aplica política de contraseña.
    - Hashea la contraseña con bcrypt.
    - Asegura unicidad de usuario_key.
    - Asigna rol (si no viene, por seguridad se recomienda 'cliente' en registro público).
    Retorna documento creado (sin password_hash).
    """
    try:
        validated = UsuarioCreate.model_validate(payload)
    except ValidationError as e:
        raise RegisterError(f"Validación de payload falló: {e}")

    # If role omitted (in some flows), enforce default cliente for public registration
    rol = validated.rol or "cliente"

    _check_password_policy(validated.password)

    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]

    usuario_key = _normalize_user_key(validated.usuario)
    # check unique
    if usuarios_col.find_one({"usuario_key": usuario_key}):
        raise RegisterError("usuario_key ya existe")

    hashed = _hash_password(validated.password)

    doc = {
        "usuario": validated.usuario,
        "usuario_key": usuario_key,
        "password_hash": hashed,
        "rol": rol,
        "activo": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
    }

    res = usuarios_col.insert_one(doc)
    doc["_id"] = res.inserted_id

    # prepare safe return
    out = {
        "_id": str(doc["_id"]),
        "usuario": doc["usuario"],
        "usuario_key": doc["usuario_key"],
        "rol": doc["rol"],
        "activo": doc["activo"],
        "created_at": doc["created_at"].isoformat(),
        "last_login": None,
    }
    return out
