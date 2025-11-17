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
        
        # Asumiendo que _id en 'areas' puede ser un número, lo convertimos a string
        # Si _id es ObjectId, str() también funciona. Esto es seguro.
        areas = [
            {"_id": str(a["_id"]), "nombre": a["nombre"]} 
            for a in areas_cursor
        ]
        return jsonify({"success": True, "data": areas})
    except Exception as e:
        return jsonify({"success": False, "error": f"Error en obtener_areas: {str(e)}"}), 500


# ===============================
# GET /api/productos/<area_id>
# ===============================
@punto_venta.route("/productos/<area_id>", methods=["GET"])
def obtener_productos(area_id):
    try:
        # --- INICIO DEL CAMBIO (area_id es un NÚMERO) ---
        # El area_id de la URL es un string (ej: "1")
        # Debemos convertirlo a entero (ej: 1) para buscar en la BD
        try:
            area_id_num = int(area_id)
        except ValueError:
            return jsonify({"success": False, "error": "ID de área debe ser un número"}), 400

        # Buscamos en la colección 'productos' usando el NÚMERO
        productos_cursor = db["productos"].find({"area_id": area_id_num}).sort("nombre")
        # --- FIN DEL CAMBIO ---
        
        productos = [
            {
                "_id": str(p["_id"]),
                "nombre": p["nombre"],
                "precio": p.get("precio", 0), 
                # Devolvemos el area_id original (string) que recibimos
                # Esto es lo que el frontend usará
                "area_id": area_id 
            }
            for p in productos_cursor
        ]
        return jsonify({"success": True, "data": productos})
    except Exception as e:
        return jsonify({"success": False, "error": f"Error en obtener_productos: {str(e)}"}), 500


# ===============================
# POST /api/ventas
# ===============================
@punto_venta.route("/ventas", methods=["POST"])
def registrar_venta():
    try:
        data = request.json or {}

        cliente_ref = data.get("cliente_ref")
        productos_in = data.get("productos", []) 
        vendedor_key = data.get("vendedor_key", "admin")
        metodo_pago = data.get("metodo_pago", "efectivo")
        estado = data.get("estado", "completada")

        if not productos_in:
            return jsonify({"success": False, "error": "Debe incluir al menos un producto"}), 400

        productos_procesados = []
        total_calculado = 0.0

        for item in productos_in:
            # 1. Validar producto (esto usa ObjectId, lo cual parece correcto para _id de producto)
            try:
                producto_id_obj = ObjectId(item["producto_id"])
            except Exception:
                 return jsonify({"success": False, "error": f"ID de producto inválido: {item['producto_id']}"}), 400
            
            producto_db = db["productos"].find_one({"_id": producto_id_obj})
            if not producto_db:
                return jsonify({"success": False, "error": f"Producto no encontrado: {item['producto_id']}"}), 404

            # --- INICIO DEL CAMBIO (area_id es un NÚMERO) ---
            # 2. Encontrar el área para guardar el nombre
            # item["area_id"] es un string (ej: "1") que envió el frontend
            try:
                area_id_num = int(item["area_id"])
            except Exception:
                return jsonify({"success": False, "error": f"ID de área inválido en el item: {item['area_id']}"}), 400

            # Asumimos que la colección 'areas' usa NÚMEROS para su _id
            area_db = db["areas"].find_one({"_id": area_id_num})
            area_nombre = area_db["nombre"] if area_db else "Area Desconocida"
            # --- FIN DEL CAMBIO ---

            # 3. Calcular subtotal en el servidor
            precio_real = float(producto_db.get("precio", 0))
            cantidad = int(item.get("cantidad", 1))
            subtotal = precio_real * cantidad
            total_calculado += subtotal

            # 4. Construir el objeto que SÍ se guardará en la venta
            productos_procesados.append({
                "producto_id": producto_id_obj,
                "nombre": producto_db["nombre"],
                "precio": precio_real,
                "cantidad": cantidad,
                "subtotal": subtotal,
                "area_id": item["area_id"], # Guardamos el string (ej: "1") por consistencia
                "area_nombre": area_nombre 
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
            "productos": productos_procesados, 
            "total": total_calculado, 
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
        # Añadimos f-string para ver el error específico
        return jsonify({"success": False, "error": f"Error en registrar_venta: {str(e)}"}), 500
    
# ===============================
# GET /api/reportes/top-productos
# (Esta ruta no necesita cambios)
# ===============================
@punto_venta.route("/reportes/top-productos", methods=["GET"])
def get_top_productos():
    try:
        pipeline = [
            {
                "$unwind": "$productos" # Desenrolla el array de productos
            },
            {
                "$group": {
                    "_id": "$productos.nombre", 
                    "totalIngresos": {"$sum": "$productos.subtotal"},
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
            
            item["value"] = f"${item['valueRaw']:,.2f}"

        return jsonify({"success": True, "data": resultados})

    except Exception as e:
        return jsonify({"success": False, "error": f"Error en top-productos: {str(e)}"}), 500

# ===============================
# NUEVA RUTA /api/reportes/ventas-por-area
# (Esta ruta no necesita cambios)
# ===============================
@punto_venta.route("/reportes/ventas-por-area", methods=["GET"])
def get_ventas_por_area():
    try:
        pipeline = [
            {
                "$unwind": "$productos"
            },
            {
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

        return jsonify({"success": True, "data": resultados})

    except Exception as e:
        return jsonify({"success": False, "error": f"Error en ventas-por-area: {str(e)}"}), 500


# GET /api/ventas/resumen-30-dias
@punto_venta.route("/ventas/resumen-30-dias", methods=["GET"])
def resumen_grafica_30_dias():
    try:
        # 1. Definimos el rango de tiempo
        hoy = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        fecha_fin = hoy + timedelta(days=1)      # Mañana a las 00:00
        fecha_inicio = hoy - timedelta(days=30)  # Hace 30 días

        # 2. Creamos el pipeline de agregación
        pipeline = [
            # Etapa 1: Filtrar solo las ventas de los últimos 30 días
            {
                "$match": {
                    "created_at": {
                        "$gte": fecha_inicio,
                        "$lt": fecha_fin
                    }
                }
            },
            # Etapa 2: Agrupar por día y sumar el total
            {
                "$group": {
                    "_id": { 
                        "$dateToString": { "format": "%Y-%m-%d", "date": "$created_at" } 
                    },
                    "total": { "$sum": "$total" }
                }
            },
            # Etapa 3: Ordenar por fecha (ascendente)
            {
                "$sort": { "_id": 1 }
            },
            # Etapa 4: Dar el formato final (renombrar _id a fecha)
            {
                "$project": {
                    "_id": 0,             # Ocultar el _id original
                    "fecha": "$_id",      # Asignar el valor de _id a "fecha"
                    "total": 1            # Mostrar el total
                }
            }
        ]

        # Ejecutamos la consulta
        resultados = list(db["ventas"].aggregate(pipeline))

        # Retornamos la lista directa como pediste
        return jsonify(resultados)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Error al procesar la gráfica"}), 500