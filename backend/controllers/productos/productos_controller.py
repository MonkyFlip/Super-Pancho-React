from flask import Blueprint, request, jsonify
from bson.json_util import dumps
from models.productos_model import ProductoModel

productos_bp = Blueprint("productos", __name__)
producto_model = ProductoModel()


# GET ALL
@productos_bp.route("/productos", methods=["GET"])
def obtener_productos():
    try:
        productos = producto_model.get_all()
        return dumps(productos), 200
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
