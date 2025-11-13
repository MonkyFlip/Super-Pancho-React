from flask import Blueprint, jsonify, request
from bson import ObjectId
from datetime import datetime
from db.conexion import get_db

punto_venta = Blueprint("punto_venta", __name__)
db = get_db()

# ===============================
# GET /api/areas
# ===============================
@punto_venta.route("/areas", methods=["GET"])
def obtener_areas():
    try:
        areas_cursor = db["areas"].find().sort("nombre")
        areas = [{"_id": str(a["_id"]), "nombre": a["nombre"]} for a in areas_cursor]
        return jsonify({"success": True, "areas": areas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===============================
# GET /api/productos/<area_id>
# ===============================
@punto_venta.route("/productos/<area_id>", methods=["GET"])
def obtener_productos(area_id):
    try:
        productos_cursor = db["productos"].find({"area_id": area_id}).sort("nombre")
        productos = [
            {
                "_id": str(p["_id"]),
                "nombre": p["nombre"],
                "precio": p["precio"]
            }
            for p in productos_cursor
        ]
        return jsonify({"success": True, "productos": productos})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===============================
# POST /api/ventas
# ===============================
@punto_venta.route("/ventas", methods=["POST"])
def registrar_venta():
    try:
        data = request.json or {}

        cliente_ref = data.get("cliente_ref")
        productos = data.get("productos", [])
        total = data.get("total", 0)
        vendedor_key = data.get("vendedor_key", "admin")
        metodo_pago = data.get("metodo_pago", "efectivo")
        estado = data.get("estado", "completada")

        # validar productos
        if not productos:
            return jsonify({"success": False, "error": "Debe incluir al menos un producto"}), 400

        # convertir cliente_ref si viene y es válido
        cliente_ref_obj = None
        if cliente_ref:
            try:
                cliente_ref_obj = ObjectId(cliente_ref)
            except Exception:
                return jsonify({"success": False, "error": "cliente_ref inválido"}), 400

        fecha_actual = datetime.utcnow()
        fecha_ordinal = int(fecha_actual.timestamp())

        venta = {
            # si cliente_ref_obj es None, guardamos None o simplemente omitimos la clave
            "cliente_ref": cliente_ref_obj,
            "productos": productos,
            "total": total,
            "vendedor_key": vendedor_key,
            "metodo_pago": metodo_pago,
            "fecha": fecha_actual.isoformat(),
            "created_at": fecha_actual,
            "estado": estado,
            "fecha_ordinal": fecha_ordinal
        }

        result = db["ventas"].insert_one(venta)

        return jsonify({
            "success": True,
            "mensaje": "Venta registrada exitosamente",
            "venta_id": str(result.inserted_id)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===============================
# GET /api/ventas/resumen
# ===============================
@punto_venta.route("/ventas/resumen", methods=["GET"])
def resumen_diario():
    try:
        hoy = datetime.utcnow().strftime("%Y-%m-%d")
        fecha_formateada = datetime.utcnow().strftime("%d/%m/%Y")

        # Buscar ventas del día actual
        ventas_hoy = list(db["ventas"].find({"fecha": {"$regex": f"^{hoy}"}}))

        if not ventas_hoy:
            return jsonify({
                "success": True,
                "mensaje": f"No hay ventas registradas el {fecha_formateada}",
                "resumen": []
            })

        total_diario = sum(v["total"] for v in ventas_hoy)
        cantidad_ventas = len(ventas_hoy)

        resumen = {
            "fecha": fecha_formateada,
            "total_vendido": total_diario,
            "cantidad_ventas": cantidad_ventas,
            "ventas": [
                {
                    "_id": str(v["_id"]),
                    "total": v["total"],
                    "vendedor": v.get("vendedor_key", "N/A"),
                    "metodo_pago": v.get("metodo_pago", "N/A"),
                    "estado": v.get("estado", "N/A"),
                    "fecha": v["fecha"]
                }
                for v in ventas_hoy
            ]
        }

        return jsonify({"success": True, "resumen": resumen})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
