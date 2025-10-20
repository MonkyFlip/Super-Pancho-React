# delete.py
"""
Eliminación de clientes.
delete_client borra por _id y retorna True si eliminó, False si no existía.
"""
from typing import Callable
from pymongo.database import Database
from bson import ObjectId

class ClientError(ValueError):
    pass

def _ensure_db(db_or_callable: Callable[[], Database] | Database) -> Database:
    if callable(db_or_callable):
        db = db_or_callable()
    else:
        db = db_or_callable
    if db is None:
        raise RuntimeError("Database no disponible (get_db_callable retornó None)")
    return db

def delete_client(db_or_callable: Callable[[], Database] | Database, client_id: str) -> bool:
    db = _ensure_db(db_or_callable)
    clientes_col = db["clientes"]
    try:
        _id = ObjectId(client_id)
    except Exception:
        raise ClientError("client_id inválido")
    res = clientes_col.delete_one({"_id": _id})
    return res.deleted_count == 1
