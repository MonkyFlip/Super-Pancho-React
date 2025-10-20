# create.py
"""
Creación de ventas.
Funciones puras que reciben get_db_callable o Database y payload dict.
Validan con models.ventas_model.VentaCreate y retornan dict serializable.
Si no viene total se calcula a partir de los items.
Se intenta conservar referencia cliente_id si es válido ObjectId.
"""
from typing import Callable, Dict, Any, Optional, List
from datetime import datetime
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId
from decimal import Decimal

from ...models.ventas_model import VentaCreate, VentaItem

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
    if isinstance(doc.get("fecha"), datetime):
        doc["fecha"] = doc["fecha"].isoformat()
    return doc

def _calculate_total(items: List[Dict[str, Any]]) -> float:
    total = Decimal("0")
    for it in items:
        precio = Decimal(str(it.get("precio", 0)))
        cantidad = int(it.get("cantidad", 0))
        total += precio * cantidad
    return float(total.quantize(Decimal("0.01")))

def create_sale(db_or_callable: Callable[[], Database] | Database, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea una venta validando payload contra VentaCreate.
    Calcula total si no viene y normaliza productos.
    Retorna el documento insertado serializado.
    """
    try:
        validated = VentaCreate.model_validate(payload)
    except ValidationError as e:
        raise SaleError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    ventas_col = db["ventas"]

    # normalize productos items
    products: List[Dict[str, Any]] = []
    for it in validated.productos:
        if isinstance(it, VentaItem):
            item = it.model_dump()
        elif isinstance(it, dict):
            item = VentaItem.model_validate(it).model_dump()
        else:
            raise SaleError("Formato inválido en productos")
        products.append(item)

    # total
    total = validated.total if (validated.total is not None and validated.total > 0) else _calculate_total(products)

    # cliente_id conversion
    cliente_ref = None
    if validated.cliente_id is not None:
        try:
            cliente_ref = ObjectId(validated.cliente_id)
        except Exception:
            # if it's already ObjectId object, keep it; otherwise ignore invalid ref
            if isinstance(validated.cliente_id, ObjectId):
                cliente_ref = validated.cliente_id
            else:
                cliente_ref = None

    doc = {
        "cliente_id": cliente_ref,
        "productos": products,
        "total": float(total),
        "vendedor_key": validated.vendedor_key,
        "metodo_pago": validated.metodo_pago,
        "fecha": validated.fecha or datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow(),
        "estado": "completada"
    }

    res = ventas_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)
