# update.py
"""
Actualización de productos.
Valida payload con models.productos_model.ProductoUpdate.
Controla colisiones de SKU y actualiza timestamps.
Retorna el documento actualizado serializado.
"""
from typing import Callable, Dict, Any, Optional
from datetime import datetime
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from ...models.productos_model import ProductoUpdate

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
    if isinstance(doc.get("updated_at"), datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc

def update_product(db_or_callable: Callable[[], Database] | Database, product_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        validated = ProductoUpdate.model_validate(payload)
    except ValidationError as e:
        raise ProductError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    productos_col = db["productos"]

    try:
        _id = ObjectId(product_id)
    except Exception:
        raise ProductError("product_id inválido")

    update_doc: Dict[str, Any] = validated.model_dump(exclude_none=True)
    # if sku in update, ensure uniqueness against other docs
    if "sku" in update_doc and update_doc.get("sku") is not None:
        existing = productos_col.find_one({"sku": update_doc["sku"], "_id": {"$ne": _id}})
        if existing:
            raise ProductError("SKU ya existe en otro producto")

    if "stock" in update_doc:
        update_doc["stock"] = int(update_doc["stock"])

    if not update_doc:
        raise ProductError("Nada para actualizar")

    update_doc["updated_at"] = datetime.utcnow()

    res = productos_col.find_one_and_update({"_id": _id}, {"$set": update_doc}, return_document=True)
    if not res:
        raise ProductError("Producto no encontrado")

    return _serialize_doc(res)
