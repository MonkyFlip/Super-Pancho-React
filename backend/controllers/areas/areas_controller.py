from flask import Blueprint, request, jsonify
from bson.json_util import dumps
from models.areas_model import AreaModel

areas_bp = Blueprint("areas", __name__)
area_model = AreaModel()


# CREATE
@areas_bp.route("/areas", methods=["POST"], endpoint="areas_create")
def create_area():
    data = request.get_json()

    if not data or "nombre" not in data:
        return jsonify({"error": "Debe incluir nombre"}), 400

    res = area_model.create_area(data)
    return jsonify({
        "msg": "Área creada",
        "id": data["_id"]
    }), 201

# READ ALL (with pagination)
@areas_bp.route("/areas", methods=["GET"], endpoint="areas_list")
def get_areas():
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=10, type=int)

    result = area_model.get_areas_paginated(page, limit)
    return dumps(result), 200


# READ BY ID
@areas_bp.route("/areas/<int:area_id>", methods=["GET"], endpoint="areas_get_by_id")
def get_area(area_id):
    area = area_model.get_area_by_id(area_id)
    if not area:
        return jsonify({"error": "Área no encontrada"}), 404

    return dumps(area), 200


# UPDATE
@areas_bp.route("/areas/<int:area_id>", methods=["PUT"], endpoint="areas_update")
def update_area(area_id):
    data = request.get_json()

    if not data:
        return jsonify({"error": "Debe enviar datos"}), 400

    res = area_model.update_area(area_id, data)

    if res.modified_count == 0:
        return jsonify({"msg": "No hubo cambios o el área no existe"}), 404

    return jsonify({"msg": "Área actualizada"}), 200


# DELETE
@areas_bp.route("/areas/<int:area_id>", methods=["DELETE"], endpoint="areas_delete")
def delete_area(area_id):
    res = area_model.delete_area(area_id)

    if res.deleted_count == 0:
        return jsonify({"error": "Área no encontrada"}), 404

    return jsonify({"msg": "Área eliminada"}), 200
