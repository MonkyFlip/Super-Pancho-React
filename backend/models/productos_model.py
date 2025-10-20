# models/productos_model.py
from typing import Optional, Dict, Any, Annotated
from pydantic import BaseModel, constr, condecimal, Field
from decimal import Decimal
from .common import BaseOutModel

NombreStr = Annotated[str, constr(min_length=1, max_length=256)]
SKUStr = Annotated[str, constr(min_length=1, max_length=64)]
PrecioDec = Annotated[Decimal, condecimal(gt=0, max_digits=12, decimal_places=2)]

class ProductoCreate(BaseModel):
    nombre: NombreStr
    precio: PrecioDec
    area_id: int
    sku: Optional[SKUStr] = None
    stock: int = 0
    activo: bool = True
    metadata: Optional[Dict[str, Any]] = None

class ProductoUpdate(BaseModel):
    nombre: Optional[NombreStr]
    precio: Optional[PrecioDec]
    area_id: Optional[int]
    sku: Optional[SKUStr]
    stock: Optional[int]
    activo: Optional[bool]
    metadata: Optional[Dict[str, Any]]

class ProductoOut(BaseOutModel):
    nombre: str
    precio: Decimal
    area_id: int
    sku: Optional[str]
    stock: int
    activo: bool
    metadata: Optional[Dict[str, Any]]
