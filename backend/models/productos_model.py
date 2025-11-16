from bson.objectid import ObjectId
from datetime import datetime
from db.conexion import get_db


class ProductoModel:

    def __init__(self):
        self.db = get_db()
        self.collection = self.db["productos"]

    def _construir_filtro(self, filtro_opcional={}):
        """
        Helper interno para combinar siempre el filtro base {"activo": True}
        con cualquier filtro opcional que se pase.
        """
        # Filtro base que siempre queremos aplicar
        filtro_base = {"activo": True}
        
        # Combina el filtro base con el opcional.
        # Esto nos da {"activo": True, "area_id": 1} si se pasa "area_id"
        # o solo {"activo": True} si el filtro opcional está vacío.
        filtro_final = {**filtro_base, **filtro_opcional}
        return filtro_final

    def get_all(self, filtro={}):
        """
        Obtiene todos los productos (no paginado)
        que coincidan con el filtro opcional y estén activos.
        """
        filtro_final = self._construir_filtro(filtro)
        return list(self.collection.find(filtro_final))
    
    def get_all_paginated(self, skip, limit, filtro={}):
        """
        Obtiene productos paginados
        que coincidan con el filtro opcional y estén activos.
        """
        # --- MODIFICADO ---
        # Ahora usamos el helper para construir el filtro final
        filtro_final = self._construir_filtro(filtro)
        
        cursor = self.collection.find(filtro_final).skip(skip).limit(limit)
        return list(cursor)
    
    def count(self, filtro={}):
        """
        Cuenta todos los productos
        que coincidan con el filtro opcional y estén activos.
        """
        # --- MODIFICADO ---
        # Ahora usamos el helper para construir el filtro final
        filtro_final = self._construir_filtro(filtro)
        
        return self.collection.count_documents(filtro_final)

    def get_by_id(self, id):
        """
        Obtiene un producto por ID, solo si está activo.
        """
        try:
            # --- MEJORA ---
            # Aplicamos el filtro aquí también para no mostrar
            # productos inactivos aunque se pidan por ID.
            filtro_final = self._construir_filtro({"_id": ObjectId(id)})
            return self.collection.find_one(filtro_final)
        except:
            return None

    def create(self, data):
        data["created_at"] = datetime.utcnow()
        data["activo"] = True  # Correcto
        result = self.collection.insert_one(data)
        return str(result.inserted_id)

    def update(self, id, data):
        try:
            # No usamos el helper aquí, ya que podrías querer
            # actualizar un producto inactivo.
            result = self.collection.update_one(
                {"_id": ObjectId(id)},
                {"$set": data}
            )
            return result.modified_count > 0
        except:
            return False

    def delete(self, id):
        """ Soft delete: Marca un producto como inactivo """
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(id)},
                {"$set": {"activo": False}}
            )
            return result.modified_count > 0
        except:
            return False