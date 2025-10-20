# read.py
"""
Lectura de productos.
Provee: get_product_by_id, get_product_by_sku, list_products con paginación y filtros simples.
No expone datos sensibles (no hay).
"""
from typing import Callable, Optional, Dict, Any, List
from datetime import datetime
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

def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

def get_product_by_id(db_or_callable: Callable[[], Database] | Database, product_id: str) -> Optional[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    productos_col = db["productos"]
    try:
        _id = ObjectId(product_id)
    except Exception:
        raise ProductError("product_id inválido")
    doc = productos_col.find_one({"_id": _id})
    return _serialize_doc(doc)

def get_product_by_sku(db_or_callable: Callable[[], Database] | Database, sku: str) -> Optional[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    productos_col = db["productos"]
    doc = productos_col.find_one({"sku": sku})
    return _serialize_doc(doc)

def list_products(db_or_callable: Callable[[], Database] | Database,
                  limit: int = 100, skip: int = 0, area_id: Optional[int] = None, activo: Optional[bool] = None) -> List[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    productos_col = db["productos"]
    q = {}
    if area_id is not None:
        q["area_id"] = int(area_id)
    if activo is not None:
        q["activo"] = bool(activo)
    cursor = productos_col.find(q).skip(int(skip)).limit(int(limit))
    results = []
    for doc in cursor:
        results.append(_serialize_doc(doc))
    return results
