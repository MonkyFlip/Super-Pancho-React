# update.py
"""
Actualización de ventas.
Valida payload contra models.ventas_model.VentaUpdate.
Permite actualizar productos, total, estado, metodo_pago y vendedor_key.
Si se actualizan productos y no viene total, se recalcula.
Retorna documento actualizado serializado.
"""
from typing import Callable, Dict, Any, Optional, List
from datetime import datetime
from pymongo.database import Database
from pydantic import ValidationError
from bson import ObjectId
from decimal import Decimal

from ...models.ventas_model import VentaUpdate, VentaItem

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
    return doc

def _calculate_total(items: List[Dict[str, Any]]) -> float:
    total = Decimal("0")
    for it in items:
        precio = Decimal(str(it.get("precio", 0)))
        cantidad = int(it.get("cantidad", 0))
        total += precio * cantidad
    return float(total.quantize(Decimal("0.01")))

def update_sale(db_or_callable: Callable[[], Database] | Database, sale_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        validated = VentaUpdate.model_validate(payload)
    except ValidationError as e:
        raise SaleError(f"Validación de payload falló: {e}")

    db = _ensure_db(db_or_callable)
    ventas_col = db["ventas"]

    try:
        _id = ObjectId(sale_id)
    except Exception:
        raise SaleError("sale_id inválido")

    update_doc: Dict[str, Any] = validated.model_dump(exclude_none=True)

    # if productos provided, normalize and possibly recalc total
    if "productos" in update_doc:
        items_raw = update_doc["productos"] or []
        normalized: List[Dict[str, Any]] = []
        for it in items_raw:
            if isinstance(it, VentaItem):
                normalized.append(it.model_dump())
            elif isinstance(it, dict):
                normalized.append(VentaItem.model_validate(it).model_dump())
            else:
                raise SaleError("Formato inválido en productos")
        update_doc["productos"] = normalized
        if not update_doc.get("total"):
            update_doc["total"] = _calculate_total(normalized)

    if not update_doc:
        raise SaleError("Nada para actualizar")

    update_doc["updated_at"] = datetime.utcnow()

    res = ventas_col.find_one_and_update({"_id": _id}, {"$set": update_doc}, return_document=True)
    if not res:
        raise SaleError("Venta no encontrada")

    return _serialize_doc(res)
