from typing import Optional, Literal, Annotated
from pydantic import BaseModel, Field, constr, ConfigDict
from datetime import datetime
from .common import PyObjectId

UsuarioStr = Annotated[str, constr(min_length=3, max_length=64)]
PasswordStr = Annotated[str, constr(min_length=4, max_length=128)]
Role = Literal["administrador", "trabajador", "cliente"]

class UsuarioCreate(BaseModel):
    usuario: UsuarioStr
    password: PasswordStr
    rol: Role = Field(..., description="administrador|trabajador|cliente")
    activo: bool = True

class UsuarioUpdate(BaseModel):
    usuario: Optional[UsuarioStr]
    password: Optional[PasswordStr]
    rol: Optional[Role]
    activo: Optional[bool]

class UsuarioOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(None, alias="_id")
    usuario: str
    usuario_key: str
    rol: str
    activo: bool
    last_login: Optional[datetime] = None
