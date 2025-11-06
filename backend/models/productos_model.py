from bson.objectid import ObjectId
from datetime import datetime
from db.conexion import get_db


class ProductoModel:

    def __init__(self):
        self.db = get_db()
        self.collection = self.db["productos"]

    def get_all(self):
        return list(self.collection.find({"activo": True}))

    def get_by_id(self, id):
        try:
            return self.collection.find_one({"_id": ObjectId(id)})
        except:
            return None

    def create(self, data):
        data["created_at"] = datetime.utcnow()
        data["activo"] = True
        result = self.collection.insert_one(data)
        return str(result.inserted_id)

    def update(self, id, data):
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(id)},
                {"$set": data}
            )
            return result.modified_count > 0
        except:
            return False

    def delete(self, id):
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(id)},
                {"$set": {"activo": False}}
            )
            return result.modified_count > 0
        except:
            return False
