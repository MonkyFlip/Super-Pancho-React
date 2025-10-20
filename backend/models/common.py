# models/common.py
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            try:
                return ObjectId(v)
            except Exception:
                raise ValueError("Invalid ObjectId")
        raise ValueError("Invalid ObjectId type")

class BaseOutModel(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            ObjectId: lambda v: str(v),
            PyObjectId: lambda v: str(v),
            datetime: lambda v: v.isoformat()
        }
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
