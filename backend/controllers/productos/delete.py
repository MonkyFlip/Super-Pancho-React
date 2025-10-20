# delete.py
"""
Eliminación de productos.
delete_product borra por _id y retorna True si eliminó, False si no existía.
"""
from typing import Callable
from pymongo.database import Database
from bson import ObjectId

class ProductError(ValueError):
    pass

def _ensure_db(db_or_callable: Callable[[], Database] | Database) -> Database:
    if callable(db_or_callable):
        db = db_or_callable()
    else:
        db = db_or_callable
    if db is None:
        raise RuntimeError("Database no disponible (get_db_callable retornó None)")
    return db

def delete_product(db_or_callable: Callable[[], Database] | Database, product_id: str) -> bool:
    db = _ensure_db(db_or_callable)
    productos_col = db["productos"]
    try:
        _id = ObjectId(product_id)
    except Exception:
        raise ProductError("product_id inválido")
    res = productos_col.delete_one({"_id": _id})
    return res.deleted_count == 1
