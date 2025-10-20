# models/areas_model.py
from typing import Optional, Annotated
from pydantic import BaseModel, constr, Field
from .common import BaseOutModel

NombreStr = Annotated[str, constr(min_length=1, max_length=128)]

class AreaCreate(BaseModel):
    _id: Optional[int] = None
    nombre: NombreStr
    descripcion: Optional[str] = None

class AreaUpdate(BaseModel):
    nombre: Optional[NombreStr]
    descripcion: Optional[str]

class AreaOut(BaseOutModel):
    _id: Optional[int] = None
    nombre: str
    descripcion: Optional[str]
