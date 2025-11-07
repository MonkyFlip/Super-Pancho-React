from db.conexion import get_db


class AreaModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["areas"]

    # Crear área
    def create_area(self, data):
        return self.collection.insert_one(data)

    # Obtener áreas con paginación
    def get_areas_paginated(self, page, limit):
        skip = (page - 1) * limit

        data = list(self.collection.find().skip(skip).limit(limit))
        total = self.collection.count_documents({})

        return {
            "data": data,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

    # Obtener área por ID
    def get_area_by_id(self, area_id):
        return self.collection.find_one({"_id": int(area_id)})

    # Actualizar área
    def update_area(self, area_id, new_data):
        return self.collection.update_one(
            {"_id": int(area_id)},
            {"$set": new_data}
        )

    # Eliminar área
    def delete_area(self, area_id):
        return self.collection.delete_one({"_id": int(area_id)})
