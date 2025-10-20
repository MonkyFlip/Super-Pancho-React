# delete.py
"""
Funciones de eliminación para la colección usuarios.
delete_user borra por _id y retorna True si eliminó, False si no existía.
"""
from typing import Callable
from pymongo.database import Database
from bson import ObjectId

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


def delete_user(db_or_callable: Callable[[], Database] | Database, user_id: str) -> bool:
    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise UserError("user_id inválido")
    res = usuarios_col.delete_one({"_id": _id})
    return res.deleted_count == 1
