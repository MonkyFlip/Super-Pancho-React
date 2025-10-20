# read.py
"""
Lectura de clientes.
Provee: get_client_by_id, get_client_by_name, list_clients con paginación y filtros simples.
"""
from typing import Callable, Optional, Dict, Any, List
from datetime import datetime
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

def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

def get_client_by_id(db_or_callable: Callable[[], Database] | Database, client_id: str) -> Optional[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    clientes_col = db["clientes"]
    try:
        _id = ObjectId(client_id)
    except Exception:
        raise ClientError("client_id inválido")
    doc = clientes_col.find_one({"_id": _id})
    return _serialize_doc(doc)

def get_client_by_name(db_or_callable: Callable[[], Database] | Database, name: str) -> List[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    clientes_col = db["clientes"]
    cursor = clientes_col.find({"nombre": {"$regex": name, "$options": "i"}}).limit(100)
    return [_serialize_doc(d) for d in cursor]

def list_clients(db_or_callable: Callable[[], Database] | Database,
                 limit: int = 100, skip: int = 0, min_total: Optional[float] = None, max_total: Optional[float] = None) -> List[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    clientes_col = db["clientes"]
    q: Dict[str, Any] = {}
    if min_total is not None or max_total is not None:
        q["total"] = {}
        if min_total is not None:
            q["total"]["$gte"] = float(min_total)
        if max_total is not None:
            q["total"]["$lte"] = float(max_total)
        if not q["total"]:
            q.pop("total", None)
    cursor = clientes_col.find(q).skip(int(skip)).limit(int(limit))
    return [_serialize_doc(d) for d in cursor]
