# create.py
"""
Creación de clientes.
Funciones puras que reciben get_db_callable o Database y payload dict.
Validan con models.clientes_model.ClienteCreate y retornan dict serializable.
Si no viene 'total' se calcula a partir de los items en 'productos'.
"""
from typing import Callable, Dict, Any, Optional
from datetime import datetime
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId

from ...models.clientes_model import ClienteCreate, CompraItem

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

def _calculate_total(items: Optional[list]) -> float:
    if not items:
        return 0.0
    total = 0.0
    for it in items:
        precio = float(it.get("precio", 0))
        cantidad = int(it.get("cantidad", 0))
        total += precio * cantidad
    return round(total, 2)

def create_client(db_or_callable: Callable[[], Database] | Database, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un cliente validando payload contra ClienteCreate.
    Calcula total si no se proporcionó y normaliza 'productos'.
    Retorna el documento insertado serializado.
    """
    try:
        validated = ClienteCreate.model_validate(payload)
    except ValidationError as e:
        raise ClientError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    clientes_col = db["clientes"]

    productos = validated.productos or []
    # ensure each item matches CompraItem structure
    normalized_items = []
    for it in productos:
        if isinstance(it, CompraItem):
            item = it.model_dump()
        elif isinstance(it, dict):
            item = CompraItem.model_validate(it).model_dump()
        else:
            raise ClientError("Formato inválido en productos")
        normalized_items.append(item)

    total = validated.total if (validated.total is not None and validated.total > 0) else _calculate_total(normalized_items)

    doc = {
        "nombre": validated.nombre,
        "contacto": validated.contacto,
        "productos": normalized_items,
        "total": float(total),
        "fecha": validated.fecha or datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow()
    }

    res = clientes_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)
