# read.py
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
        raise RuntimeError("Database no disponible")
    return db

def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc: return doc
    doc = dict(doc)
    if "_id" in doc: doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime): doc["created_at"] = doc["created_at"].isoformat()
    if isinstance(doc.get("last_login"), datetime): doc["last_login"] = doc["last_login"].isoformat()
    doc.pop("password_hash", None)
    return doc

# ... (get_user_by_id y get_user_by_key se quedan igual) ...
def get_user_by_id(db_or_callable, user_id):
    # (Tu código existente...)
    db = _ensure_db(db_or_callable)
    try: _id = ObjectId(user_id)
    except: raise UserError("user_id inválido")
    doc = db["usuarios"].find_one({"_id": _id}, {"password_hash": 0})
    return _serialize_doc(doc)

def get_user_by_key(db_or_callable, usuario_key):
    # (Tu código existente...)
    db = _ensure_db(db_or_callable)
    key = usuario_key.strip().lower()
    doc = db["usuarios"].find_one({"usuario_key": key}, {"password_hash": 0})
    return _serialize_doc(doc)


# ✅ MODIFICADO: Acepta parámetro search
def list_users(db_or_callable: Callable[[], Database] | Database, limit: int = 100, skip: int = 0, search: str = None) -> List[Dict[str, Any]]:
    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]

    # Construir filtro
    filtro = {}
    if search:
        # Busca en 'usuario' O 'usuario_key' (insensible a mayúsculas)
        filtro["$or"] = [
            {"usuario": {"$regex": search, "$options": "i"}},
            {"usuario_key": {"$regex": search, "$options": "i"}}
        ]

    cursor = usuarios_col.find(filtro, {"password_hash": 0}).skip(int(skip)).limit(int(limit))
    
    results = []
    for doc in cursor:
        results.append(_serialize_doc(doc))
    return results

# ✅ NUEVO: Función para contar resultados (para la paginación)
def count_users(db_or_callable: Callable[[], Database] | Database, search: str = None) -> int:
    db = _ensure_db(db_or_callable)
    usuarios_col = db["usuarios"]
    
    filtro = {}
    if search:
        filtro["$or"] = [
            {"usuario": {"$regex": search, "$options": "i"}},
            {"usuario_key": {"$regex": search, "$options": "i"}}
        ]
        
    return usuarios_col.count_documents(filtro)