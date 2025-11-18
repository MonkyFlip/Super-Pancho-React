# routes.py
import os
import logging
import json
import threading
from flask import Blueprint, request, make_response, current_app
from bson import json_util
from bson.objectid import ObjectId, InvalidId
import gridfs
import gridfs.errors
import jwt as pyjwt
from jwt import ImmatureSignatureError, ExpiredSignatureError, InvalidTokenError

# Imports internos que usan las rutas
from db.conexion import get_db
from controllers.db.crear_db_controller import crear_y_poblar_db, ProgressMonitor
from controllers.login.login_controller import login_user, AuthError, JWT_SECRET, JWT_ALGO

# --- Blueprint ---
main_bp = Blueprint('main_routes', __name__)

# --- Logger ---
logger = logging.getLogger(__name__)

# --- Constantes (movidas desde main) ---
JWT_LEEWAY = int(os.environ.get('JWT_LEEWAY_SECONDS', '60'))
DEV_IGNORE_IAT = os.environ.get('DEV_IGNORE_IAT', '1') == '1'

# -----------------------
# Utilidades JSON (movidas desde main)
# -----------------------
def _serialize_for_json(obj):
    try:
        return json.loads(json_util.dumps(obj))
    except Exception:
        try:
            return json.loads(json.dumps(obj))
        except Exception:
            return str(obj)

# -----------------------
# Variables para control de background job
# -----------------------
_crear_db_thread = None
_crear_db_lock = threading.Lock()

# -----------------------
# Rutas (ahora con @main_bp.route)
# -----------------------
@main_bp.route('/', methods=['GET'])
def index():
    base = request.host_url.rstrip('/')
    html = f"""
    <!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>API Backend</title>
    <style>body{{font-family:system-ui,Segoe UI,Roboto,Arial;background:#f6f8fb;color:#111;padding:28px}}.card{{background:#fff;border-radius:12px;padding:18px;max-width:1000px;margin:18px auto;box-shadow:0 8px 26px rgba(16,24,40,0.06)}}a{{
    color:#2563eb;text-decoration:none}}</style></head><body>
    <div class="card"><h1>API Backend + Spark</h1><p>Usa <a href="{base}/api">/api</a> para explorar endpoints o <a href="{base}/api/analisis">/api/analisis</a> para análisis con Spark.</p>
    </div></body></html>
    """
    resp = make_response(html, 200)
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    return resp

# -----------------------
# Endpoints auxiliares
# -----------------------
@main_bp.route('/colecciones', methods=['GET'])
def listar_colecciones():
    try:
        db = get_db()
        if db is None:
            return {"ok": False, "error": "DB no disponible"}, 500
        names = db.list_collection_names()
        return {"ok": True, "colecciones": names}, 200
    except Exception as e:
        logger.exception("Error en /colecciones: %s", e)
        return {"ok": False, "error": str(e)}, 500

# -----------------------
# Login / Me / Logout
# -----------------------
@main_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    usuario = data.get('usuario')
    password = data.get('password')
    try:
        result = login_user(get_db, usuario, password)
        if not isinstance(result, dict):
            raise Exception("Respuesta inesperada de login_user")
        user = result.get("user") or result.get("usuario")
        token = result.get("token")
        expires_in = result.get("expiresIn")
        serialized_user = _serialize_for_json(user) if user else None
        if isinstance(serialized_user, dict):
            serialized_user.pop("password_hash", None)
        return {"user": serialized_user, "token": token, "expiresIn": expires_in}, 200
    except AuthError as e:
        return {"error": str(e)}, 401
    except Exception as e:
        logger.exception("Error interno en /login: %s", e)
        return {"error": "Error interno"}, 500

@main_bp.route('/me', methods=['GET'])
def me():
    auth = request.headers.get('Authorization') or ''
    token = auth[7:].strip() if auth.startswith('Bearer ') else None
    if not token:
        return {"error": "no authenticated"}, 401

    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO], leeway=JWT_LEEWAY)
    except ImmatureSignatureError as e:
        if DEV_IGNORE_IAT:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO], options={"verify_iat": False})
        else:
            return {"error": "token not yet valid"}, 401
    except ExpiredSignatureError:
        return {"error": "token expired"}, 401
    except InvalidTokenError:
        return {"error": "invalid token"}, 401

    user_id = payload.get('sub')
    if not user_id:
        return {"error": "invalid token"}, 401

    db = get_db()
    user = db['usuarios'].find_one({"_id": ObjectId(user_id)})
    if not user:
        return {"error": "user not found"}, 404
    user_serial = _serialize_for_json(user)
    user_serial.pop('password_hash', None)
    return user_serial, 200

@main_bp.route('/logout', methods=['POST'])
def logout():
    return {"ok": True}, 200

# -----------------------
# DB utils
# -----------------------
@main_bp.route('/verifica_db', methods=['GET'])
def verifica_db():
    try:
        db = get_db()
        ok = db is not None and "usuarios" in db.list_collection_names()
        return {"ok": ok}, 200
    except Exception as e:
        logger.exception("Error en /verifica_db: %s", e)
        return {"ok": False}, 500

@main_bp.route('/crear_db', methods=['POST'])
def crear_db():
    """
    Inicia el proceso de creación y poblamiento en background.
    Devuelve totals inmediatamente para que el frontend pueda iniciar polling.
    Si ya hay un proceso en ejecución, devuelve 409 con los totals actuales.
    """
    global _crear_db_thread
    try:
        with _crear_db_lock:
            if _crear_db_thread and _crear_db_thread.is_alive():
                totals = ProgressMonitor.counts_from_config()
                return {"ok": False, "mensaje": "Proceso ya en ejecución", "totals": totals}, 409

            def _worker():
                try:
                    crear_y_poblar_db(get_db)
                except Exception as e:
                    logger.exception("Error en background crear_db: %s", e)

            _crear_db_thread = threading.Thread(target=_worker, daemon=True, name="crear_db_worker")
            _crear_db_thread.start()

            totals = ProgressMonitor.counts_from_config()
            return {"ok": True, "mensaje": "Proceso iniciado", "totals": totals}, 202

    except Exception as e:
        logger.exception("Error en /crear_db: %s", e)
        return {"error": str(e)}, 500

# -----------------------
# Multimedia
# -----------------------
@main_bp.route('/multimedia/archivos', methods=['GET'])
def listar_archivos_multimedia():
    try:
        db = get_db()
        fs = gridfs.GridFS(db, collection="multimedia")
        tipo = request.args.get('tipo')
        if not tipo:
            return {"error": "El parámetro 'tipo' es requerido"}, 400
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        query = {"tipo": tipo}
        total_count = db["multimedia.files"].count_documents(query)
        cursor = fs.find(query).skip(skip).limit(limit)
        archivos_list = [{
            "id": str(f._id),
            "filename": f.filename,
            "content_type": f.content_type,
            "length": f.length,
            "upload_date": f.upload_date.isoformat() if f.upload_date else None,
            "tipo": getattr(f, "tipo", None)
        } for f in cursor]
        total_pages = (total_count + limit - 1) // limit
        return {"ok": True, "archivos": archivos_list, "pagination": {
            "total_count": total_count,
            "current_page": page,
            "page_size": limit,
            "total_pages": total_pages
        }}, 200
    except Exception as e:
        logger.exception("Error en /multimedia/archivos: %s", e)
        return {"error": str(e)}, 500

@main_bp.route('/multimedia/archivo/<string:file_id>', methods=['GET'])
def ver_archivo_multimedia(file_id):
    try:
        db = get_db()
        fs = gridfs.GridFS(db, collection="multimedia")
        oid = ObjectId(file_id)
        grid_out = fs.get(oid)
        return make_response(grid_out.read(), 200, {
            "Content-Type": grid_out.content_type or "application/octet-stream",
            "Content-Disposition": f'inline; filename="{grid_out.filename}"'
        })
    except (InvalidId, gridfs.errors.NoFile):
        return {"error": "Archivo no encontrado"}, 404
    except Exception as e:
        logger.exception("Error en /multimedia/archivo/%s: %s", file_id, e)
        return {"error": str(e)}, 500

# -----------------------
# Endpoint: progreso de poblamiento y multimedia
# -----------------------
@main_bp.route('/db/progreso', methods=['GET'])
def db_progreso():
    try:
        db = get_db()
        if db is None:
            return {"error": "DB no disponible"}, 500

        # Usamos la clase ProgressMonitor definida en crear_db_controller.py
        snapshot = ProgressMonitor.snapshot(db)

        # Devolvemos counts, current, status y message tal como espera el frontend
        return snapshot, 200
    except Exception as e:
        logger.exception("Error en /db/progreso: %s", e)
        return {"error": str(e)}, 500
