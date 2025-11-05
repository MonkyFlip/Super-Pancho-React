# create.py
"""
Funciones de creación para la colección usuarios.
Reciben get_db_callable o una instancia Database y payload dict deserializado.
Validan con Pydantic (models/usuarios_model.UsuarioCreate) y aplican política de contraseña.
Devuelven dict serializable del usuario creado.
"""
from typing import Callable, Dict, Any
from datetime import datetime
import re
import bcrypt
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from models.usuarios_model import UsuarioCreate

# Password policy: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un dígito y un carácter especial
PWD_POLICY_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")


class UserError(ValueError):
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
        raise UserError(
            "Password inseguro: minimo 8 caracteres, incluir mayúscula, minúscula, dígito y caracter especial"
        )


def _normalize_user_key(usuario: str) -> str:
    return usuario.strip().lower()


def create_user(db_or_callable: Callable[[], Database] | Database, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un usuario nuevo validando payload contra UsuarioCreate.
    Hashea la contraseña con bcrypt y asegura unicidad de usuario_key.
    Retorna un dict serializable del usuario creado.
    """
    try:
        validated = UsuarioCreate.model_validate(payload)
    except ValidationError as e:
        raise UserError(f"Validación de payload falló: {e}")

    _check_password_policy(validated.password)

    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]

    usuario_key = _normalize_user_key(validated.usuario)
    if usuarios_col.find_one({"usuario_key": usuario_key}):
        raise UserError("usuario_key ya existe")

    hashed = _hash_password(validated.password)

    doc = {
        "usuario": validated.usuario,
        "usuario_key": usuario_key,
        "password_hash": hashed,
        "rol": validated.rol,
        "activo": validated.activo if validated.activo is not None else True,
        "created_at": datetime.utcnow(),
        "last_login": None,
    }

    res = usuarios_col.insert_one(doc)
    doc["_id"] = res.inserted_id

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
