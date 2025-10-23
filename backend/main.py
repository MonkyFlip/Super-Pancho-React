# backend/main.py
from dotenv import load_dotenv
import os
import logging
import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from bson import json_util
from pymongo import ASCENDING

# cargar variables de entorno
load_dotenv()

# imports de la aplicación (ajusta si cambian las rutas internas)
from .db.conexion import get_db
from .controllers.db.crear_db_controller import crear_y_poblar_db
from .controllers.login.login_controller import login_user, AuthError

app = Flask(__name__)

# -----------------------
# Configuración básica
# -----------------------
app.secret_key = os.environ.get("SECRET_KEY", "clave_insegura_dev")

FRONTEND_ORIGINS = [
    os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://127.0.0.1:3000",
    "http://localhost:3000"
]

# CORS: permitir orígenes de desarrollo, métodos y headers comunes
CORS(app,
     resources={r"/*": {"origins": FRONTEND_ORIGINS}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("API iniciado. JWT secret configured: %s", bool(os.environ.get("JWT_SECRET")))

# -----------------------
# Utilidades
# -----------------------
def _serialize_for_json(obj):
    """
    Convierte objetos BSON (ObjectId, datetimes) a JSON serializable usando bson.json_util
    """
    try:
        return json.loads(json_util.dumps(obj))
    except Exception:
        try:
            return json.loads(json.dumps(obj))
        except Exception:
            return str(obj)

# -----------------------
# Preflight / OPTIONS handler
# -----------------------
@app.before_request
def handle_options_preflight():
    """
    Responder explícitamente a OPTIONS con 200 OK para evitar que middlewares posteriores
    (autenticación, DB) bloqueen el preflight.
    """
    if request.method == 'OPTIONS':
        resp = make_response('', 200)
        return resp

# -----------------------
# Root: página interactiva "API de Super Pancho"
# -----------------------
@app.route('/', methods=['GET'])
def index():
    base = request.host_url.rstrip('/')
    html = f"""
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>API de Super Pancho</title>
        <style>
          body {{ font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; background:#f6f8fb; color:#111; padding:28px; }}
          .card {{ background:#fff; border-radius:12px; padding:18px; box-shadow:0 8px 26px rgba(16,24,40,0.06); max-width:1000px; margin:18px auto; }}
          h1 {{ margin:0 0 8px 0; font-size:22px; }}
          p {{ margin:0 0 12px 0; color:#555; }}
          button {{ margin:6px 8px 6px 0; padding:8px 12px; border-radius:8px; border:1px solid #e6eefc; background:#fff; cursor:pointer; }}
          pre {{ background:#0f1720; color:#e6eefc; padding:12px; border-radius:8px; overflow:auto; max-height:360px; }}
          .small {{ color:#777; margin-top:10px; display:block; }}
        </style>
      </head>
      <body>
        <div class="card">
          <h1>API de Super Pancho</h1>
          <p>Servidor de desarrollo. Usa los botones para inspeccionar colecciones y documentos.</p>

          <div>
            <button onclick="fetchCollections()">Listar colecciones</button>
            <button onclick="fetchUsuarios()">Ver /usuarios (primeros 50)</button>
            <button onclick="fetchCollectionSample('clientes')">Ver /clientes (primeros 50)</button>
            <button onclick="fetchCollectionSample('productos')">Ver /productos (primeros 50)</button>
            <button onclick="pingVerificaDb()">Verificar DB</button>
            <button onclick="document.getElementById('out').textContent = ''">Limpiar</button>
          </div>

          <div style="margin-top:12px;">
            <div style="font-weight:800">Salida</div>
            <pre id="out">Lista de colecciones y endpoints disponibles...</pre>
            <div class="small">Origin detectada: {request.headers.get('Origin') or 'N/A'}</div>
          </div>

        </div>

        <script>
          const base = '{base}';

          async function fetchCollections() {{
            try {{
              const res = await fetch(base + '/colecciones');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}

          async function fetchUsuarios() {{
            try {{
              const res = await fetch(base + '/usuarios?limit=50');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}

          async function fetchCollectionSample(name) {{
            try {{
              const res = await fetch(base + '/coleccion/' + encodeURIComponent(name) + '?limit=50');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}

          async function pingVerificaDb() {{
            try {{
              const res = await fetch(base + '/verifica_db');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}
        </script>
      </body>
    </html>
    """
    resp = make_response(html, 200)
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    return resp

# -----------------------
# Endpoint: listar colecciones disponibles
# -----------------------
@app.route('/colecciones', methods=['GET'])
def listar_colecciones():
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "DB no disponible"}), 500
        names = db.list_collection_names()
        return jsonify({"ok": True, "colecciones": names}), 200
    except Exception as e:
        logger.exception("Error en /colecciones: %s", e)
        return jsonify({"error": str(e)}), 500

# -----------------------
# Endpoint: obtener documentos de una colección (safe)
# -----------------------
@app.route('/coleccion/<string:nombre>', methods=['GET'])
def coleccion_sample(nombre):
    try:
        limit = int(request.args.get('limit') or 50)
        limit = max(1, min(limit, 200))
    except Exception:
        limit = 50
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "DB no disponible"}), 500
        if nombre not in db.list_collection_names():
            return jsonify({"error": f"Colección '{nombre}' no encontrada"}), 404
        cursor = db[nombre].find().limit(limit)
        docs = list(cursor)
        return jsonify({"ok": True, "coleccion": nombre, "count": len(docs), "docs": _serialize_for_json(docs)}), 200
    except Exception as e:
        logger.exception("Error en /coleccion/%s: %s", nombre, e)
        return jsonify({"error": str(e)}), 500

# -----------------------
# Endpoint /usuarios (compatibilidad con frontend)
# -----------------------
@app.route('/usuarios', methods=['GET'])
def usuarios_list():
    """
    Endpoint público que devuelve docs paginados y el conteo total.
    Acepta query params:
      - limit (int, default 10, max 1000)
      - skip (int, default 0) OR page (1-based)
      - q (string) búsqueda simple
    """
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "DB no disponible"}), 500

        # limit
        try:
            limit = int(request.args.get('limit') or request.args.get('perPage') or 10)
        except Exception:
            limit = 10
        limit = max(1, min(limit, 1000))

        # skip via skip or page
        skip = 0
        if request.args.get('skip') is not None:
            try:
                skip = int(request.args.get('skip') or 0)
            except Exception:
                skip = 0
        elif request.args.get('page') is not None:
            try:
                page = int(request.args.get('page') or 1)
                page = max(1, page)
                skip = (page - 1) * limit
            except Exception:
                skip = 0

        q = request.args.get('q') or None

        query = {}
        if q:
            # búsqueda simple en usuario, nombre o email
            query = {
                "$or": [
                    {"usuario": {"$regex": q, "$options": "i"}},
                    {"nombre": {"$regex": q, "$options": "i"}},
                    {"email": {"$regex": q, "$options": "i"}}
                ]
            }

        usuarios_col = db['usuarios']

        # obtener conteo total (rápido si hay índices adecuados)
        total = usuarios_col.count_documents(query)

        # obtener documentos paginados; ordenar por _id ascendente para consistencia
        cursor = usuarios_col.find(query, {"password_hash": 0}).sort([("_id", ASCENDING)]).skip(skip).limit(limit)
        docs = list(cursor)

        # serializar ObjectId y fechas de forma sencilla
        def _to_serializable(doc):
            d = dict(doc)
            if "_id" in d:
                try:
                    d["_id"] = str(d["_id"])
                except Exception:
                    pass
            for k in ("created_at", "last_login", "updated_at"):
                if k in d and hasattr(d[k], "isoformat"):
                    try:
                        d[k] = d[k].isoformat()
                    except Exception:
                        pass
            d.pop("password_hash", None)
            return d

        serial = [_to_serializable(d) for d in docs]

        return jsonify({"ok": True, "count": total, "docs": serial, "limit": limit, "skip": skip}), 200

    except Exception as e:
        logger.exception("Error en /usuarios: %s", e)
        return jsonify({"error": str(e)}), 500

# -----------------------
# Endpoints existentes (login, verifica_db, crear_db, debug_cookies)
# -----------------------
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
        redirect = result.get("redirect")
        token = result.get("token")
        expires_in = result.get("expiresIn") or result.get("expires_in") or None

        serialized_user = None
        if user:
            # normalizar y eliminar password_hash
            serialized_user = _serialize_for_json(user)
            if isinstance(serialized_user, dict):
                serialized_user.pop("password_hash", None)

        resp_payload = {}
        if serialized_user is not None:
            resp_payload["user"] = serialized_user
        if redirect:
            resp_payload["redirect"] = redirect
        resp_payload["token"] = token
        if expires_in:
            resp_payload["expiresIn"] = expires_in

        # Log de auditoría mínimo
        try:
            rol = serialized_user.get("rol") if isinstance(serialized_user, dict) else None
            logger.info("Login exitoso: usuario=%s rol=%s desde IP=%s", usuario, str(rol), request.remote_addr or "desconocida")
        except Exception:
            logger.info("Login exitoso: usuario=%s desde IP=%s", usuario, request.remote_addr or "desconocida")

        return jsonify(resp_payload), 200
    except AuthError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.exception("Error interno en /login: %s", e)
        return jsonify({'error': 'Error interno'}), 500

@app.route('/me', methods=['GET'])
def me():
    return jsonify({"error": "no authenticated"}), 401

@app.route('/logout', methods=['POST'])
def logout():
    return jsonify({"ok": True}), 200

@app.route('/verifica_db', methods=['GET'])
def verifica_db():
    try:
        db = get_db()
        ok = db is not None and "usuarios" in db.list_collection_names()
        return jsonify({"ok": ok})
    except Exception as e:
        logger.exception("Error en /verifica_db: %s", e)
        return jsonify({"ok": False}), 500

@app.route('/crear_db', methods=['POST'])
def crear_db():
    try:
        payload = request.get_json(silent=True) or {}
        total = payload.get("total")
        logger.info("POST /crear_db recibido, total=%s desde %s", total, request.remote_addr)
        resumen = crear_y_poblar_db(get_db, total_records=total)
        return jsonify({"ok": True, "mensaje": "Base creada y poblada (si no existía).", "resumen": resumen}), 200
    except Exception as e:
        logger.exception("Error en /crear_db: %s", e)
        return jsonify({"error": str(e)}), 500

@app.route('/debug_cookies', methods=['GET'])
def debug_cookies():
    try:
        logger.info("Request cookies: %s", dict(request.cookies))
        return jsonify(dict(request.cookies)), 200
    except Exception as e:
        logger.exception("Error en /debug_cookies: %s", e)
        return jsonify({}), 500

# -----------------------
# Main
# -----------------------
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
