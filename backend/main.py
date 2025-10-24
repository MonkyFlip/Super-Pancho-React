# backend/main.py
import os
import logging
import json
import time
import threading
from datetime import datetime
from flask import Flask, request, make_response, current_app
from flask_cors import CORS
from bson import json_util
from bson.objectid import ObjectId, InvalidId

# carga variables de entorno
from dotenv import load_dotenv
load_dotenv()

# imports internos
from db.conexion import get_db
from controllers.db.crear_db_controller import crear_y_poblar_db
from controllers.login.login_controller import login_user, AuthError, JWT_SECRET, JWT_ALGO

# regresion blueprint (asegúrate de controllers/regresion_lineal/__init__.py que exporta bp)
from controllers.regresion_lineal import bp as regresion_bp
from api import bp as api_bp  # blueprint que expone la interfaz interactiva /api

# util para migración
from controllers.regresion_lineal.actualiza_fecha_ordinal import run_migration

# -----------------------
# App y configuración
# -----------------------
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "clave_insegura_dev")
app.config['GET_DB'] = get_db

# CORS: permitir orígenes de desarrollo comunes
FRONTEND_ORIGINS = [
    os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://127.0.0.1:3000",
    "http://localhost:3000"
]
CORS(app,
     resources={r"/*": {"origins": FRONTEND_ORIGINS}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# logging básico
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("API iniciado. JWT secret configured: %s", bool(os.environ.get("JWT_SECRET")))

# Registrar blueprints
app.register_blueprint(regresion_bp)  # /regresion
app.register_blueprint(api_bp)        # /api

# -----------------------
# Iniciar migración fecha_ordinal en background (no bloqueante)
# -----------------------
def start_background_migration():
    try:
        def _run():
            try:
                db_getter = app.config.get('GET_DB') or get_db
                app.logger.info("Iniciando migración fecha_ordinal (background)...")
                res = run_migration(db_getter)
                app.logger.info("Migración fecha_ordinal completada: %s", res)
            except Exception as e:
                app.logger.exception("Error en migración background: %s", e)
        t = threading.Thread(target=_run, daemon=True, name="fecha_ordinal_migration")
        t.start()
    except Exception:
        app.logger.exception("No se pudo iniciar thread de migración")

# llamar después de registrar blueprints
start_background_migration()

# -----------------------
# Utilidades
# -----------------------
def _serialize_for_json(obj):
    """Convierte objetos BSON (ObjectId, datetimes) a JSON serializable usando bson.json_util."""
    try:
        return json.loads(json_util.dumps(obj))
    except Exception:
        try:
            return json.loads(json.dumps(obj))
        except Exception:
            return str(obj)

@app.before_request
def handle_options_preflight():
    if request.method == 'OPTIONS':
        return make_response('', 200)

# -----------------------
# Root HTML interactivo (pequeña landing)
# -----------------------
@app.route('/', methods=['GET'])
def index():
    base = request.host_url.rstrip('/')
    html = f"""
    <!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>API Backend</title>
    <style>body{{font-family:system-ui,Segoe UI,Roboto,Arial;background:#f6f8fb;color:#111;padding:28px}}.card{{background:#fff;border-radius:12px;padding:18px;max-width:1000px;margin:18px auto;box-shadow:0 8px 26px rgba(16,24,40,0.06)}}a{{
    color:#2563eb;text-decoration:none}}</style></head><body>
    <div class="card"><h1>API Backend</h1><p>Interfaz mínima. Usa <a href="{base}/api">/api</a> para explorar colecciones y endpoints.</p>
    <ul>
      <li><a href="{base}/api">API Explorer (HTML)</a></li>
      <li><a href="{base}/api/colecciones">/api/colecciones (JSON)</a></li>
      <li><a href="{base}/regresion/simple">/regresion/simple (POST)</a></li>
      <li><a href="{base}/regresion/multiple">/regresion/multiple (POST)</a></li>
    </ul>
    <div style="margin-top:12px;font-size:13px;color:#666">Origin detectada: {request.headers.get('Origin') or 'N/A'}</div>
    </div></body></html>
    """
    resp = make_response(html, 200)
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    return resp

# -----------------------
# Endpoints auxiliares compatibles con UI/dev
# -----------------------
@app.route('/colecciones', methods=['GET'])
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

@app.route('/coleccion/<string:nombre>', methods=['GET'])
def coleccion_sample(nombre):
    try:
        try:
            limit = int(request.args.get('limit') or 50)
        except Exception:
            limit = 50
        limit = max(1, min(limit, 1000))

        db = get_db()
        if db is None:
            return {"error": "DB no disponible"}, 500
        if nombre not in db.list_collection_names():
            return {"error": f"Colección '{nombre}' no encontrada"}, 404
        cursor = db[nombre].find().limit(limit)
        docs = list(cursor)
        return {"ok": True, "coleccion": nombre, "count": len(docs), "docs": _serialize_for_json(docs)}, 200
    except Exception as e:
        logger.exception("Error en /coleccion/%s: %s", nombre, e)
        return {"error": str(e)}, 500

# DEBUG: endpoint simple para listar usuarios (temporal, para panel)
@app.route('/usuarios', methods=['GET'])
def listar_usuarios_debug():
    try:
        db = get_db()
        if db is None:
            return {"ok": False, "error": "DB no disponible"}, 500
        try:
            limit = int(request.args.get('limit', 10))
            skip = int(request.args.get('skip', 0))
        except Exception:
            limit, skip = 10, 0
        cursor = db['usuarios'].find().skip(skip).limit(limit)
        docs = list(cursor)
        return {"ok": True, "count": len(docs), "usuarios": _serialize_for_json(docs)}, 200
    except Exception as e:
        current_app.logger.exception("Error en /usuarios: %s", e)
        return {"ok": False, "error": str(e)}, 500

# -----------------------
# Login / Me / Logout
# -----------------------
import jwt as pyjwt  # PyJWT
from jwt import ImmatureSignatureError, ExpiredSignatureError, InvalidTokenError

JWT_LEEWAY = int(os.environ.get('JWT_LEEWAY_SECONDS', '60'))  # tolerancia en segundos para iat/exp
DEV_IGNORE_IAT = os.environ.get('DEV_IGNORE_IAT', '1') == '1'  # solo para desarrollo; poner '0' en producción

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    usuario = data.get('usuario')
    password = data.get('password')
    try:
        result = login_user(get_db, usuario, password)
        if not isinstance(result, dict):
            raise Exception("Respuesta inesperada de login_user")
        user = result.get("user") or result.get("usuario") or result.get("data") or None
        token = result.get("token")
        expires_in = result.get("expiresIn") or result.get("expires_in") or None
        serialized_user = _serialize_for_json(user) if user else None
        if isinstance(serialized_user, dict):
            serialized_user.pop("password_hash", None)
        resp_payload = {}
        if serialized_user is not None:
            resp_payload["user"] = serialized_user
        resp_payload["token"] = token
        if expires_in:
            resp_payload["expiresIn"] = expires_in
        logger.info("Login exitoso: usuario=%s desde IP=%s", usuario, request.remote_addr or "desconocida")
        return resp_payload, 200
    except AuthError as e:
        return {"error": str(e)}, 401
    except Exception as e:
        logger.exception("Error interno en /login: %s", e)
        return {"error": "Error interno"}, 500

@app.route('/me', methods=['GET'])
def me():
    auth = request.headers.get('Authorization') or ''
    token = auth[7:].strip() if auth.startswith('Bearer ') else None
    if not token:
        return {"error": "no authenticated"}, 401

    try:
        # Intento normal con leeway configurable
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO], leeway=JWT_LEEWAY)
    except ImmatureSignatureError as e:
        current_app.logger.warning("Token iat in the future: server_time=%s token_error=%s", int(time.time()), str(e))
        # En desarrollo, intentar decodificar ignorando la verificación de iat para diagnóstico
        if DEV_IGNORE_IAT:
            try:
                payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO], options={"verify_iat": False})
                current_app.logger.info("Decoded token payload (iat ignored for dev): %s", {k: payload.get(k) for k in ['sub','iat','exp','rol']})
            except Exception as e2:
                current_app.logger.warning("Fallback decode (ignore iat) failed: %s", str(e2))
                return {"error": "token not yet valid (iat) or server time mismatch"}, 401
        else:
            return {"error": "token not yet valid (iat) or server time mismatch"}, 401
    except ExpiredSignatureError:
        return {"error": "token expired"}, 401
    except InvalidTokenError as e:
        current_app.logger.warning("Invalid token on /me: %s", str(e))
        return {"error": "invalid token"}, 401
    except Exception as e:
        current_app.logger.exception("Unexpected error decoding token on /me: %s", e)
        return {"error": "no authenticated"}, 401

    # al llegar aquí payload está decodificado
    user_id = payload.get('sub')
    if not user_id:
        return {"error": "invalid token"}, 401

    try:
        db = get_db()
        user = db['usuarios'].find_one({"_id": ObjectId(user_id)})
        if not user:
            return {"error": "user not found"}, 404
        user_serial = _serialize_for_json(user)
        user_serial.pop('password_hash', None)
        return user_serial, 200
    except Exception as e:
        current_app.logger.exception("Error fetching user in /me: %s", e)
        return {"error": "no authenticated"}, 401

@app.route('/logout', methods=['POST'])
def logout():
    return {"ok": True}, 200

# -----------------------
# DB verification and creation
# -----------------------
@app.route('/verifica_db', methods=['GET'])
def verifica_db():
    try:
        db = get_db()
        ok = db is not None and "usuarios" in db.list_collection_names()
        return {"ok": ok}, 200
    except Exception as e:
        logger.exception("Error en /verifica_db: %s", e)
        return {"ok": False}, 500

@app.route('/crear_db', methods=['POST'])
def crear_db():
    try:
        payload = request.get_json(silent=True) or {}
        total = payload.get("total")
        logger.info("POST /crear_db recibido, total=%s desde %s", total, request.remote_addr)
        resumen = crear_y_poblar_db(get_db, total_records=total)
        return {"ok": True, "mensaje": "Base creada y poblada (si no existía).", "resumen": resumen}, 200
    except Exception as e:
        logger.exception("Error en /crear_db: %s", e)
        return {"error": str(e)}, 500

# -----------------------
# Multimedia (GridFS) endpoints (simplificados)
# -----------------------
import gridfs
@app.route('/multimedia/archivos', methods=['GET'])
def listar_archivos_multimedia():
    try:
        db = get_db()
        fs = gridfs.GridFS(db, collection="multimedia")
        tipo = request.args.get('tipo')
        if not tipo:
            return {"error": "El parámetro 'tipo' es requerido (ej: 'imagen', 'video')"}, 400
        try:
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 20))
            page = max(1, page)
            limit = max(1, min(limit, 100))
        except ValueError:
            return {"error": "'page' y 'limit' deben ser números enteros"}, 400
        skip = (page - 1) * limit
        query = {"tipo": tipo}
        total_count = db["multimedia.files"].count_documents(query)
        cursor = fs.find(query).skip(skip).limit(limit)
        archivos_list = []
        for f in cursor:
            archivos_list.append({
                "id": str(f._id),
                "filename": f.filename,
                "content_type": f.content_type,
                "length": f.length,
                "upload_date": f.upload_date.isoformat() if f.upload_date else None,
                "tipo": getattr(f, "tipo", None)
            })
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
        return {"ok": True, "archivos": archivos_list, "pagination": {"total_count": total_count, "current_page": page, "page_size": limit, "total_pages": total_pages}}, 200
    except Exception as e:
        logger.exception("Error en /multimedia/archivos: %s", e)
        return {"error": "Error interno del servidor", "detalle": str(e)}, 500

@app.route('/multimedia/archivo/<string:file_id>', methods=['GET'])
def ver_archivo_multimedia(file_id):
    try:
        db = get_db()
        fs = gridfs.GridFS(db, collection="multimedia")
        try:
            oid = ObjectId(file_id)
        except InvalidId:
            return {"error": "ID de archivo inválido"}, 400
        try:
            grid_out = fs.get(oid)
            return make_response(grid_out.read(), 200, {
                "Content-Type": grid_out.content_type or "application/octet-stream",
                "Content-Disposition": f'inline; filename="{grid_out.filename}"'
            })
        except gridfs.errors.NoFile:
            return {"error": "Archivo no encontrado"}, 404
    except Exception as e:
        logger.exception("Error en /multimedia/archivo/%s: %s", file_id, e)
        return {"error": "Error interno del servidor", "detalle": str(e)}, 500

# -----------------------
# Main
# -----------------------
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(host='0.0.0.0', port=port, debug=debug)
