# update.py
"""
Funciones de actualización para la colección usuarios.
Validan payload con models.usuarios_model.UsuarioUpdate.
Si cambia password aplica policy y la hashea.
Si cambia usuario valida unicidad de usuario_key.
Devuelven el documento actualizado sin password_hash.
"""
from typing import Callable, Dict, Any, Optional
from datetime import datetime
import re
import bcrypt
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from ...models.usuarios_model import UsuarioUpdate

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


def update_user(db_or_callable: Callable[[], Database] | Database, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        validated = UsuarioUpdate.model_validate(payload)
    except ValidationError as e:
        raise UserError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]

    try:
        _id = ObjectId(user_id)
    except Exception:
        raise UserError("user_id inválido")

    update_doc: Dict[str, Any] = {}
    if validated.usuario is not None:
        new_key = _normalize_user_key(validated.usuario)
        existing = usuarios_col.find_one({"usuario_key": new_key, "_id": {"$ne": _id}})
        if existing:
            raise UserError("usuario_key ya en uso por otro usuario")
        update_doc["usuario"] = validated.usuario
        update_doc["usuario_key"] = new_key

    if validated.password is not None:
        _check_password_policy(validated.password)
        update_doc["password_hash"] = _hash_password(validated.password)

    if validated.rol is not None:
        update_doc["rol"] = validated.rol

    if validated.activo is not None:
        update_doc["activo"] = validated.activo

    if not update_doc:
        raise UserError("Nada para actualizar")

    update_doc["updated_at"] = datetime.utcnow()

    res = usuarios_col.find_one_and_update({"_id": _id}, {"$set": update_doc}, projection={"password_hash": 0}, return_document=True)
    if not res:
        raise UserError("Usuario no encontrado")

    # serialize
    if "_id" in res:
        res["_id"] = str(res["_id"])
    if isinstance(res.get("created_at"), datetime):
        res["created_at"] = res["created_at"].isoformat()
    if isinstance(res.get("last_login"), datetime):
        res["last_login"] = res["last_login"].isoformat()
    res.pop("password_hash", None)
    return res
