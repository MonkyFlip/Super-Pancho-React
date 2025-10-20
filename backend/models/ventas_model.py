# models/ventas_model.py
from typing import Optional, List, Annotated
from pydantic import BaseModel, constr, Field
from .common import BaseOutModel, PyObjectId

NombreStr = Annotated[str, constr(min_length=1)]

class VentaItem(BaseModel):
    nombre: NombreStr
    precio: float
    cantidad: int
    producto_id: Optional[PyObjectId] = None

class VentaCreate(BaseModel):
    cliente_id: Optional[PyObjectId] = None
    productos: List[VentaItem]
    total: float
    vendedor_key: Optional[str] = None
    metodo_pago: Optional[str] = "efectivo"
    fecha: Optional[str] = None

class VentaUpdate(BaseModel):
    productos: Optional[List[VentaItem]]
    total: Optional[float]
    vendedor_key: Optional[str]
    metodo_pago: Optional[str]
    estado: Optional[str]

class VentaOut(BaseOutModel):
    cliente_id: Optional[PyObjectId]
    productos: List[VentaItem]
    total: float
    vendedor_key: Optional[str]
    metodo_pago: Optional[str]
    fecha: Optional[str]
    estado: Optional[str]
