# read.py
"""
Lectura de áreas.
Provee: get_area_by_id, get_area_by_name, list_areas.
"""
from typing import Callable, Optional, Dict, Any, List, Union
from datetime import datetime
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

def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc = dict(doc)
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

def get_area_by_id(db_or_callable: Callable[[], Database] | Database, area_id: Union[int, str]) -> Optional[Dict[str, Any]]:
    """
    Busca área por _id. area_id puede ser int o string convertible a int.
    Si los _id de áreas son ObjectId, permite buscar por string.
    """
    db = _ensure_db(db_or_callable)
    areas_col = db["areas"]

    # try int
    try:
        aid = int(area_id)
        doc = areas_col.find_one({"_id": aid})
        return _serialize_doc(doc)
    except Exception:
        # fallback: buscar por ObjectId/string _id
        doc = areas_col.find_one({"_id": area_id})
        return _serialize_doc(doc)

def get_area_by_name(db_or_callable: Callable[[], Database] | Database, name: str) -> Optional[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    areas_col = db["areas"]
    name_norm = name.strip()
    doc = areas_col.find_one({"nombre": {"$regex": f"^{name_norm}$", "$options": "i"}})
    return _serialize_doc(doc)

def list_areas(db_or_callable: Callable[[], Database] | Database, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    areas_col = db["areas"]
    cursor = areas_col.find({}).skip(int(skip)).limit(int(limit)).sort("nombre", 1)
    return [_serialize_doc(d) for d in cursor]
