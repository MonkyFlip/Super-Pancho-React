from db.conexion import get_db
from pymongo import ReturnDocument

class AreaModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["areas"]
        self.counters = self.db["counters"]

    # Obtener siguiente ID autoincremental
    def get_next_id(self):
        counter = self.counters.find_one_and_update(
            {"_id": "areas"},
            {"$inc": {"seq": 1}},
            return_document=ReturnDocument.AFTER,
            upsert=True
        )
        return counter["seq"]

    # Crear área
    def create_area(self, data):
        # Generar id nuevo
        data["_id"] = self.get_next_id()
        return self.collection.insert_one(data)

    # Obtener todas
    def get_areas(self):
        return list(self.collection.find())

    # ✅ CORREGIDO: Ahora acepta 'search' y aplica filtro
    def get_areas_paginated(self, page, limit, search=None):
        skip = (page - 1) * limit
        
        # 1. Crear filtro vacío
        filtro = {}
        
        # 2. Si hay texto de búsqueda, filtrar por nombre (insensible a mayúsculas)
        if search:
            filtro["nombre"] = {"$regex": search, "$options": "i"}

        # 3. Aplicar el filtro tanto a la búsqueda (.find) como al conteo (.count_documents)
        data = list(self.collection.find(filtro).skip(skip).limit(limit))
        total = self.collection.count_documents(filtro)
        
        return {
            "data": data,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 0
        }

    # Obtener por ID
    def get_area_by_id(self, area_id):
        return self.collection.find_one({"_id": int(area_id)})

    # Actualizar
    def update_area(self, area_id, new_data):
        return self.collection.update_one(
            {"_id": int(area_id)},
            {"$set": new_data}
        )

    # Eliminar
    def delete_area(self, area_id):
        return self.collection.delete_one({"_id": int(area_id)})