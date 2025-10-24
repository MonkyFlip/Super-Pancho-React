from db.conexion import get_db
db = get_db()
print("Collections:", db.list_collection_names())
print("Count ventas:", db["ventas"].count_documents({}))
sample = db["ventas"].find_one()
print("Ejemplo doc:", sample)
def count_numeric(field, limit=5000):
    c = 0
    for d in db["ventas"].find({}, {field:1}).limit(limit):
        try:
            float(d.get(field, None))
            c += 1
        except Exception:
            pass
    return c
print("fecha_ordinal numeric count:", count_numeric("fecha_ordinal"))
print("total numeric count:", count_numeric("total"))
