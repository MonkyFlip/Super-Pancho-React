# create.py
"""
Creación de productos.
Funciones puras que reciben get_db_callable o Database y payload dict.
Validan con models.productos_model.ProductoCreate y retornan dict serializable.
"""
from typing import Callable, Dict, Any, Optional
from datetime import datetime
import random
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from ...models.productos_model import ProductoCreate

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
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

def create_product(db_or_callable: Callable[[], Database] | Database, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un producto validado.
    Si viene sku y ya existe en otro producto, lanza ProductError.
    Retorna el documento insertado serializado.
    """
    try:
        validated = ProductoCreate.model_validate(payload)
    except ValidationError as e:
        raise ProductError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    productos_col = db["productos"]

    # verificar unicidad de sku si se proporcionó
    if validated.sku:
        existing = productos_col.find_one({"sku": validated.sku})
        if existing:
            raise ProductError("SKU ya existe en otro producto")

    doc = validated.model_dump(exclude_none=True)
    doc.setdefault("created_at", datetime.utcnow())
    doc.setdefault("activo", True)
    doc.setdefault("stock", int(doc.get("stock", 0)))

    res = productos_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)
