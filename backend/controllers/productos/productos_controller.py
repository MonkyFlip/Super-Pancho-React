from flask import Blueprint, request, jsonify
from bson.json_util import dumps
from models.productos_model import ProductoModel

productos_bp = Blueprint("productos", __name__)
producto_model = ProductoModel()


# GET ALL (Con Filtro de Área y Búsqueda por Nombre)
@productos_bp.route("/productos", methods=["GET"])
def obtener_productos():
    try:
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        
        # 1. Leer parámetros de filtro
        area_id_str = request.args.get("area", None)
        search_query = request.args.get("search", None)  # <--- NUEVO: Capturamos la búsqueda
        
        # 2. Preparar diccionario de filtro
        filtro = {}
        
        # 3. Lógica de Área
        if area_id_str:
            try:
                filtro["area_id"] = int(area_id_str)
            except ValueError:
                return jsonify({"error": "El ID del área debe ser un número entero"}), 400

        # 4. Lógica de Búsqueda (NUEVO)
        if search_query:
            # Busca cualquier coincidencia en el nombre, ignorando mayúsculas/minúsculas
            filtro["nombre"] = {"$regex": search_query, "$options": "i"}

        if page < 1 or limit < 1:
            return jsonify({"error": "page y limit deben ser mayores a 0"}), 400

        skip = (page - 1) * limit

        # 5. Pasa el 'filtro' completo al modelo
        productos = producto_model.get_all_paginated(skip, limit, filtro=filtro)
        total = producto_model.count(filtro=filtro)

        response = {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "data": productos
        }

        return dumps(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET ONE
@productos_bp.route("/productos/<id>", methods=["GET"])
def obtener_producto(id):
    producto = producto_model.get_by_id(id)
    if producto:
        return dumps(producto), 200
    return jsonify({"error": "Producto no encontrado"}), 404


# CREATE
@productos_bp.route("/productos", methods=["POST"])
def crear_producto():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos requeridos"}), 400

    nuevo_id = producto_model.create(data)
    return jsonify({"inserted_id": nuevo_id}), 201


# UPDATE
@productos_bp.route("/productos/<id>", methods=["PUT"])
def actualizar_producto(id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos requeridos"}), 400

    actualizado = producto_model.update(id, data)
    if actualizado:
        return jsonify({"mensaje": "Actualizado correctamente"}), 200

    return jsonify({"error": "Producto no encontrado"}), 404


# DELETE (Soft Delete)
@productos_bp.route("/productos/<id>", methods=["DELETE"])
def eliminar_producto(id):
    eliminado = producto_model.delete(id)

    if eliminado:
        return jsonify({"mensaje": "Producto desactivado"}), 200

    return jsonify({"error": "Producto no encontrado"}), 404