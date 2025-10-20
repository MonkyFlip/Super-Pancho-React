# delete.py
"""
Eliminación de ventas.
delete_sale borra por _id y retorna True si eliminó, False si no existía.
"""
from typing import Callable
from pymongo.database import Database
from bson import ObjectId

class SaleError(ValueError):
    pass

def _ensure_db(db_or_callable: Callable[[], Database] | Database) -> Database:
    if callable(db_or_callable):
        db = db_or_callable()
    else:
        db = db_or_callable
    if db is None:
        raise RuntimeError("Database no disponible (get_db_callable retornó None)")
    return db

def delete_sale(db_or_callable: Callable[[], Database] | Database, sale_id: str) -> bool:
    db = _ensure_db(db_or_callable)
    ventas_col = db["ventas"]
    try:
        _id = ObjectId(sale_id)
    except Exception:
        raise SaleError("sale_id inválido")
    res = ventas_col.delete_one({"_id": _id})
    return res.deleted_count == 1
