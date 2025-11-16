from flask import Blueprint, jsonify, request
from bson import ObjectId
from datetime import datetime, timedelta # Importar timedelta
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
        # <--- CAMBIO: Asegurarse que area_id se envía al frontend
        # (Tu frontend ya espera el _id como string, así que esto está bien)
        areas = [
            {"_id": str(a["_id"]), "nombre": a["nombre"]} 
            for a in areas_cursor
        ]
        return jsonify({"success": True, "data": areas}) # <--- CAMBIO: Usar 'data' por consistencia
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===============================
# GET /api/productos/<area_id>
# ===============================
@punto_venta.route("/productos/<area_id>", methods=["GET"])
def obtener_productos(area_id):
    try:
        # <--- CAMBIO: Tu consulta original estaba bien si 'area_id' es un string
        # Si 'area_id' en la colección 'productos' es un ObjectId, usa esto:
        # area_obj_id = ObjectId(area_id)
        # productos_cursor = db["productos"].find({"area_id": area_obj_id}).sort("nombre")
        
        # Asumiendo que 'area_id' se guarda como STRING en productos (como en tu código original)
        productos_cursor = db["productos"].find({"area_id": area_id}).sort("nombre")
        
        productos = [
            {
                "_id": str(p["_id"]),
                "nombre": p["nombre"],
                "precio": p.get("precio", 0), # Usar .get() para evitar errores
                "area_id": p.get("area_id") # <--- CAMBIO: Devolver el area_id
            }
            for p in productos_cursor
        ]
        return jsonify({"success": True, "data": productos}) # <--- CAMBIO: Usar 'data'
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
        # <--- CAMBIO CRÍTICO: 'productos' que envía el frontend
        # Esperamos: [{"producto_id": "...", "cantidad": X, "area_id": "..."}]
        productos_in = data.get("productos", []) 
        
        vendedor_key = data.get("vendedor_key", "admin")
        metodo_pago = data.get("metodo_pago", "efectivo")
        estado = data.get("estado", "completada")

        if not productos_in:
            return jsonify({"success": False, "error": "Debe incluir al menos un producto"}), 400

        # --- Validación de productos y cálculo de total en el SERVIDOR ---
        productos_procesados = []
        total_calculado = 0.0

        for item in productos_in:
            # 1. Validar y encontrar el producto en la BD (¡Seguridad!)
            producto_db = db["productos"].find_one({"_id": ObjectId(item["producto_id"])})
            if not producto_db:
                return jsonify({"success": False, "error": f"Producto no encontrado: {item['producto_id']}"}), 404

            # 2. Encontrar el área para guardar el nombre (para reportes)
            area_db = db["areas"].find_one({"_id": ObjectId(item["area_id"])})
            area_nombre = area_db["nombre"] if area_db else "Area Desconocida"

            # 3. Calcular subtotal en el servidor (¡Seguridad!)
            precio_real = float(producto_db.get("precio", 0))
            cantidad = int(item.get("cantidad", 1)) # Default a 1
            subtotal = precio_real * cantidad
            total_calculado += subtotal

            # 4. Construir el objeto que SÍ se guardará en la venta
            productos_procesados.append({
                "producto_id": ObjectId(item["producto_id"]),
                "nombre": producto_db["nombre"],
                "precio": precio_real,
                "cantidad": cantidad,
                "subtotal": subtotal,
                "area_id": item["area_id"], # Guardamos el string del ID de área
                "area_nombre": area_nombre  # Guardamos el nombre para reportes
            })
        # --- Fin de la validación ---

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
            "cliente_ref": cliente_ref_obj,
            "productos": productos_procesados, # <--- CAMBIO: Guardamos la lista procesada
            "total": total_calculado,      # <--- CAMBIO: Usamos el total calculado en el servidor
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
        return jsonify({"success": False, "error": f"Error en registrar_venta: {str(e)}"}), 500
    
# ===============================
# GET /api/reportes/top-productos
# ===============================
@punto_venta.route("/reportes/top-productos", methods=["GET"])
def get_top_productos():
    try:
        # <--- NUEVO: Filtrar solo ventas 'completadas' de los últimos 7 días
        # siete_dias_atras = datetime.utcnow() - timedelta(days=7)

        pipeline = [
            # {
            #     "$match": {
            #         "estado": "completada",
            #         "created_at": {"$gte": siete_dias_atras}
            #     }
            # },
            {
                "$unwind": "$productos" # Desenrolla el array de productos
            },
            {
                # <--- CAMBIO: Agrupar por nombre (o ID si prefieres)
                "$group": {
                    "_id": "$productos.nombre", 
                    "totalIngresos": {"$sum": "$productos.subtotal"}, # Usamos el subtotal pre-calculado
                    "totalUnidades": {"$sum": "$productos.cantidad"}
                }
            },
            {
                "$sort": {"totalIngresos": -1} # Ordena por ingresos descendente
            },
            {
                "$limit": 5 # Obtiene el Top 5
            },
            {
                "$project": {
                    "_id": 0,
                    "id": "$_id", 
                    "label": "$_id",
                    "valueRaw": "$totalIngresos",
                    "ventas": "$totalUnidades"
                }
            }
        ]
        
        resultados = list(db["ventas"].aggregate(pipeline))
        
        if not resultados:
            return jsonify({"success": True, "data": []})

        max_ingreso = resultados[0]["valueRaw"]
        
        for item in resultados:
            if max_ingreso > 0:
                item["percentage"] = (item["valueRaw"] / max_ingreso) * 100
            else:
                item["percentage"] = 0
            
            item["value"] = f"${item['valueRaw']:,.2f}" # Formatear como moneda

        return jsonify({"success": True, "data": resultados})

    except Exception as e:
        return jsonify({"success": False, "error": f"Error en top-productos: {str(e)}"}), 500

# ===============================
# NUEVA RUTA /api/reportes/ventas-por-area
# ===============================
@punto_venta.route("/reportes/ventas-por-area", methods=["GET"])
def get_ventas_por_area():
    try:
        # <--- NUEVO: Filtrar solo ventas 'completadas'
        pipeline = [
            # {
            #     "$match": {"estado": "completada"}
            # },
            {
                "$unwind": "$productos"
            },
            {
                # Agrupamos por el 'area_nombre' que guardamos en la venta
                "$group": {
                    "_id": "$productos.area_nombre", 
                    "totalVentas": {"$sum": "$productos.subtotal"}
                }
            },
            {
                "$sort": {"totalVentas": -1}
            },
            {
                "$limit": 5 # Top 5 áreas
            },
            {
                "$project": {
                    "_id": 0,
                    "id": "$_id",
                    "label": "$_id",
                    "valueRaw": "$totalVentas"
                }
            }
        ]
        
        resultados = list(db["ventas"].aggregate(pipeline))

        if not resultados:
            return jsonify({"success": True, "data": []})

        # El cálculo de porcentaje se hace en el frontend para este widget
        return jsonify({"success": True, "data": resultados})

    except Exception as e:
        return jsonify({"success": False, "error": f"Error en ventas-por-area: {str(e)}"}), 500

# ===============================
# GET /api/ventas/resumen
# ===============================
@punto_venta.route("/ventas/resumen", methods=["GET"])
def resumen_diario():
    try:
        # <--- CAMBIO: Búsqueda por fecha más robusta
        hoy_inicio = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        hoy_fin = hoy_inicio + timedelta(days=1)
        
        fecha_formateada = hoy_inicio.strftime("%d/%m/%Y")

        # Buscar ventas del día actual por 'created_at' (que es un objeto Date)
        ventas_hoy = list(db["ventas"].find({
            "created_at": {
                "$gte": hoy_inicio,
                "$lt": hoy_fin
            }
        }))

        if not ventas_hoy:
            return jsonify({
                "success": True,
                "mensaje": f"No hay ventas registradas el {fecha_formateada}",
                "resumen": {
                    "fecha": fecha_formateada,
                    "total_vendido": 0,
                    "cantidad_ventas": 0,
                    "ventas": []
                }
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
        return jsonify({"success": False, "error": f"Error en resumen_diario: {str(e)}"}), 500