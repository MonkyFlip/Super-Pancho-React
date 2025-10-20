# read.py
"""
Lectura de ventas.
Provee: get_sale_by_id, list_sales con filtros por fecha, vendedor_key, cliente_id y paginación.
Devuelve documentos serializados.
"""
from typing import Callable, Optional, Dict, Any, List
from datetime import datetime
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

def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    # fecha stored as ISO string in create; ensure type
    return doc

def get_sale_by_id(db_or_callable: Callable[[], Database] | Database, sale_id: str) -> Optional[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    ventas_col = db["ventas"]
    try:
        _id = ObjectId(sale_id)
    except Exception:
        raise SaleError("sale_id inválido")
    doc = ventas_col.find_one({"_id": _id})
    return _serialize_doc(doc)

def list_sales(db_or_callable: Callable[[], Database] | Database,
               limit: int = 100, skip: int = 0,
               vendedor_key: Optional[str] = None,
               cliente_id: Optional[str] = None,
               fecha_from: Optional[str] = None,
               fecha_to: Optional[str] = None,
               estado: Optional[str] = None) -> List[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    ventas_col = db["ventas"]
    q: Dict[str, Any] = {}
    if vendedor_key:
        q["vendedor_key"] = vendedor_key
    if cliente_id:
        try:
            q["cliente_id"] = ObjectId(cliente_id)
        except Exception:
            # if invalid ObjectId, return empty
            return []
    if estado:
        q["estado"] = estado
    # fecha_from / fecha_to are ISO strings stored in "fecha"
    if fecha_from or fecha_to:
        q["fecha"] = {}
        if fecha_from:
            q["fecha"]["$gte"] = fecha_from
        if fecha_to:
            q["fecha"]["$lte"] = fecha_to
        if not q["fecha"]:
            q.pop("fecha", None)

    cursor = ventas_col.find(q).skip(int(skip)).limit(int(limit)).sort("created_at", -1)
    results = []
    for doc in cursor:
        results.append(_serialize_doc(doc))
    return results
