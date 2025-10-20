# models/clientes_model.py
from typing import Optional, List, Dict, Any, Annotated
from pydantic import BaseModel, constr, Field
from .common import BaseOutModel

NombreStr = Annotated[str, constr(min_length=1, max_length=256)]
ItemNombre = Annotated[str, constr(min_length=1)]

class CompraItem(BaseModel):
    nombre: ItemNombre
    precio: float
    cantidad: int

class ClienteCreate(BaseModel):
    nombre: NombreStr
    contacto: Optional[Dict[str, Any]] = None
    productos: Optional[List[CompraItem]] = Field(default_factory=list)
    total: Optional[float] = 0.0
    fecha: Optional[str] = None

class ClienteUpdate(BaseModel):
    nombre: Optional[NombreStr]
    contacto: Optional[Dict[str, Any]]
    productos: Optional[List[CompraItem]]
    total: Optional[float]
    fecha: Optional[str]

class ClienteOut(BaseOutModel):
    nombre: str
    contacto: Optional[Dict[str, Any]]
    productos: List[CompraItem]
    total: float
    fecha: Optional[str]
