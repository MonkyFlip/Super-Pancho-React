# controllers/usuarios/routes.py
from flask import Blueprint, request
from bson import ObjectId

from db.conexion import get_db

# Import CRUD core
from .create import create_user, UserError as CreateUserError
from .read import get_user_by_id, list_users, get_user_by_key, UserError as ReadUserError
from .update import update_user, UserError as UpdateUserError
from .delete import delete_user, UserError as DeleteUserError

usuarios_bp = Blueprint("usuarios_routes", __name__, url_prefix="/usuarios")


# ✅ CREATE
@usuarios_bp.route("", methods=["POST"])
def crear_usuario():
    try:
        payload = request.get_json() or {}
        res = create_user(get_db, payload)
        return {"ok": True, "data": res}, 201
    except CreateUserError as e:
        return {"ok": False, "error": str(e)}, 400
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


# ✅ LIST
@usuarios_bp.route("", methods=["GET"])
def listar_usuarios():
    try:
        limit = int(request.args.get("limit", 100))
        skip = int(request.args.get("skip", 0))
        res = list_users(get_db, limit=limit, skip=skip)
        return {"ok": True, "data": res}, 200
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


# ✅ READ by id
@usuarios_bp.route("/<string:user_id>", methods=["GET"])
def obtener_usuario(user_id):
    try:
        res = get_user_by_id(get_db, user_id)
        if not res:
            return {"ok": False, "error": "Usuario no encontrado"}, 404
        return {"ok": True, "data": res}, 200
    except ReadUserError as e:
        return {"ok": False, "error": str(e)}, 400
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


# ✅ READ by key
@usuarios_bp.route("/key/<string:usuario_key>", methods=["GET"])
def obtener_usuario_key(usuario_key):
    try:
        res = get_user_by_key(get_db, usuario_key)
        if not res:
            return {"ok": False, "error": "Usuario no encontrado"}, 404
        return {"ok": True, "data": res}, 200
    except ReadUserError as e:
        return {"ok": False, "error": str(e)}, 400
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


# ✅ UPDATE
@usuarios_bp.route("/<string:user_id>", methods=["PUT"])
def actualizar_usuario(user_id):
    try:
        payload = request.get_json() or {}
        res = update_user(get_db, user_id, payload)
        return {"ok": True, "data": res}, 200
    except UpdateUserError as e:
        return {"ok": False, "error": str(e)}, 400
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


# ✅ DELETE
@usuarios_bp.route("/<string:user_id>", methods=["DELETE"])
def eliminar_usuario(user_id):
    try:
        deleted = delete_user(get_db, user_id)
        if not deleted:
            return {"ok": False, "error": "Usuario no encontrado"}, 404
        return {"ok": True}, 200
    except DeleteUserError as e:
        return {"ok": False, "error": str(e)}, 400
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500
