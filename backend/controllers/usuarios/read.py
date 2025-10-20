# read.py
"""
Funciones de lectura para la colección usuarios.
Proveen: get_user_by_id, get_user_by_key, list_users.
No exponen password_hash.
"""
from typing import Callable, Optional, Dict, Any, List
from datetime import datetime
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


def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if isinstance(doc.get("last_login"), datetime):
        doc["last_login"] = doc["last_login"].isoformat()
    # never include password_hash
    doc.pop("password_hash", None)
    return doc


def get_user_by_id(db_or_callable: Callable[[], Database] | Database, user_id: str) -> Optional[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise UserError("user_id inválido")
    doc = usuarios_col.find_one({"_id": _id}, {"password_hash": 0})
    return _serialize_doc(doc)


def get_user_by_key(db_or_callable: Callable[[], Database] | Database, usuario_key: str) -> Optional[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]
    key = usuario_key.strip().lower()
    doc = usuarios_col.find_one({"usuario_key": key}, {"password_hash": 0})
    return _serialize_doc(doc)


def list_users(db_or_callable: Callable[[], Database] | Database, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]
    cursor = usuarios_col.find({}, {"password_hash": 0}).skip(int(skip)).limit(int(limit))
    results = []
    for doc in cursor:
        results.append(_serialize_doc(doc))
    return results
