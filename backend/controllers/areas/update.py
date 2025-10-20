# update.py
"""
Actualización de áreas.
Valida payload con models.areas_model.AreaUpdate y controla unicidad de nombre.
Retorna documento actualizado serializado.
"""
from typing import Callable, Dict, Any, Optional, Union
from datetime import datetime
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from ...models.areas_model import AreaUpdate

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
    if isinstance(doc.get("updated_at"), datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc

def update_area(db_or_callable: Callable[[], Database] | Database, area_id: Union[int, str], payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Actualiza campos permitidos de una área.
    area_id puede ser int o string; si las áreas usan int en _id, se intentará convertir.
    """
    try:
        validated = AreaUpdate.model_validate(payload)
    except ValidationError as e:
        raise AreaError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    areas_col = db["areas"]

    # Resolve id
    try:
        aid = int(area_id)
        id_query = {"_id": aid}
    except Exception:
        id_query = {"_id": area_id}

    update_doc: Dict[str, Any] = validated.model_dump(exclude_none=True)
    if "nombre" in update_doc:
        nombre_norm = update_doc["nombre"].strip()
        # check uniqueness case-insensitive excluding current
        existing = areas_col.find_one({"nombre": {"$regex": f"^{nombre_norm}$", "$options": "i"}, **{"_id": {"$ne": id_query["_id"]}}})
        if existing:
            raise AreaError("Ya existe otra área con ese nombre")

    if not update_doc:
        raise AreaError("Nada para actualizar")

    update_doc["updated_at"] = datetime.utcnow()

    res = areas_col.find_one_and_update(id_query, {"$set": update_doc}, return_document=True)
    if not res:
        raise AreaError("Área no encontrada")

    return _serialize_doc(res)
