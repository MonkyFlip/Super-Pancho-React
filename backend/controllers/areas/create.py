# create.py
"""
Creación de áreas.
Funciones puras que reciben get_db_callable o Database y payload dict.
Validan con models.areas_model.AreaCreate y retornan dict serializable.
Aseguran unicidad de 'nombre' y permiten suministro opcional de _id (int).
"""
from typing import Callable, Dict, Any, Optional
from datetime import datetime
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from ...models.areas_model import AreaCreate

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
    # area _id is int or None; keep as-is
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

def create_area(db_or_callable: Callable[[], Database] | Database, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea una área validando payload contra AreaCreate.
    Verifica unicidad de nombre (case-insensitive).
    Si se provee _id intenta usarlo (puede fallar por duplicado).
    Retorna documento insertado serializado.
    """
    try:
        validated = AreaCreate.model_validate(payload)
    except ValidationError as e:
        raise AreaError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    areas_col = db["areas"]

    nombre_norm = validated.nombre.strip()
    # unicidad case-insensitive: buscar por nombre exacto; recomendamos index único en lowercase en DB (previamente creado)
    existing = areas_col.find_one({"nombre": {"$regex": f"^{nombre_norm}$", "$options": "i"}})
    if existing:
        raise AreaError("Ya existe un área con ese nombre")

    doc = validated.model_dump(exclude_none=True)
    doc.setdefault("created_at", datetime.utcnow())

    # If client provided _id, use it; otherwise let Mongo assign ObjectId or we could use integer sequence (here we accept _id optional)
    res = areas_col.insert_one(doc)
    # Ensure return includes the real _id (could be int if provided or ObjectId)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)
