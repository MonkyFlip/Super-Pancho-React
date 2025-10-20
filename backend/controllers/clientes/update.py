# update.py
"""
Actualización de clientes.
Valida payload con models.clientes_model.ClienteUpdate.
Si se actualizan 'productos' recalcula 'total' si no viene explícito.
Retorna el documento actualizado serializado.
"""
from typing import Callable, Dict, Any, Optional
from datetime import datetime
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from ...models.clientes_model import ClienteUpdate, CompraItem

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
    if isinstance(doc.get("updated_at"), datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc

def _calculate_total(items: Optional[list]) -> float:
    if not items:
        return 0.0
    total = 0.0
    for it in items:
        precio = float(it.get("precio", 0))
        cantidad = int(it.get("cantidad", 0))
        total += precio * cantidad
    return round(total, 2)

def update_client(db_or_callable: Callable[[], Database] | Database, client_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        validated = ClienteUpdate.model_validate(payload)
    except ValidationError as e:
        raise ClientError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    clientes_col = db["clientes"]

    try:
        _id = ObjectId(client_id)
    except Exception:
        raise ClientError("client_id inválido")

    update_doc: Dict[str, Any] = validated.model_dump(exclude_none=True)

    # normalize productos if provided
    if "productos" in update_doc:
        items = update_doc["productos"] or []
        normalized = []
        for it in items:
            if isinstance(it, CompraItem):
                normalized.append(it.model_dump())
            elif isinstance(it, dict):
                normalized.append(CompraItem.model_validate(it).model_dump())
            else:
                raise ClientError("Formato inválido en productos")
        update_doc["productos"] = normalized
        # recalculate total if not explicitly provided or zero
        if not update_doc.get("total"):
            update_doc["total"] = _calculate_total(normalized)

    if not update_doc:
        raise ClientError("Nada para actualizar")

    update_doc["updated_at"] = datetime.utcnow()

    res = clientes_col.find_one_and_update({"_id": _id}, {"$set": update_doc}, return_document=True)
    if not res:
        raise ClientError("Cliente no encontrado")

    return _serialize_doc(res)
