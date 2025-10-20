# delete.py
"""
Eliminación de áreas.
delete_area borra por _id (int o string) y retorna True si eliminó, False si no existía.
"""
from typing import Callable, Union
from pymongo.database import Database

class AreaError(ValueError):
    pass

def _ensure_db(db_or_callable: Callable[[], Database] | Database) -> Database:
    if callable(db_or_callable):
        db = db_or_callable()
    else:
        db = db_or_callable
    if db is None:
        raise RuntimeError("Database no disponible (get_db_callable retornó None)")
    return db

def delete_area(db_or_callable: Callable[[], Database] | Database, area_id: Union[int, str]) -> bool:
    db = _ensure_db(db_or_callable)
    areas_col = db["areas"]
    try:
        aid = int(area_id)
        res = areas_col.delete_one({"_id": aid})
    except Exception:
        res = areas_col.delete_one({"_id": area_id})
    return res.deleted_count == 1
