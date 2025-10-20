# backend/main.py
from dotenv import load_dotenv
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# Cargar .env lo antes posible para que módulos que lean os.environ obtengan las variables
load_dotenv()

from .db.conexion import get_db
from .controllers.db.crear_db_controller import crear_y_poblar_db
from .controllers.login.login_controller import login_user, AuthError

app = Flask(__name__)

# -----------------------
# Configuración básica
# -----------------------
app.secret_key = os.environ.get("SECRET_KEY", "clave_insegura_dev")

# CORS: incluir exactamente el origen del frontend en desarrollo
FRONTEND_ORIGINS = [
    os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://127.0.0.1:3000"
]
CORS(app, resources={r"/*": {"origins": FRONTEND_ORIGINS}}, supports_credentials=True)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("JWT secret configured: %s", bool(os.environ.get("JWT_SECRET")))

# -----------------------
# Utilidades
# -----------------------
def _serialize_user_for_response(user_doc):
    """
    Acepta tanto un documento serializado (dict con _id como str) como un dict bruto de mongo.
    Normaliza quitando password_hash y convirtiendo fechas y _id a strings.
    """
    if not user_doc:
        return None
    u = dict(user_doc)
    u.pop("password_hash", None)
    # _id puede venir ya como string o como ObjectId
    if "_id" in u:
        try:
            u["_id"] = str(u["_id"])
        except Exception:
            pass
    # fechas
    for k in ("created_at", "last_login"):
        if k in u and hasattr(u[k], "isoformat"):
            try:
                u[k] = u[k].isoformat()
            except Exception:
                pass
    # normalizar rol
    rol = u.get("rol") or u.get("role") or u.get("roleName") or u.get("role_type") or u.get("perfil") or u.get("nivel")
    if rol is not None:
        u["rol"] = rol
    return u

# -----------------------
# Endpoints
# -----------------------
@app.route('/login', methods=['POST'])
def login():
    """
    Flujo mínimo adaptado a login_user que retorna:
      { "user": {...}, "redirect": "/ruta", "token": "..." }
    - Serializa el user antes de devolver.
    - Devuelve 200 con la estructura completa para que el frontend decida.
    """
    data = request.get_json() or {}
    usuario = data.get('usuario')
    password = data.get('password')

    try:
        result = login_user(get_db, usuario, password)
        if not isinstance(result, dict):
            # si login_user no devolvió la forma esperada, normalizamos
            raise Exception("Respuesta inesperada de login_user")

        user = result.get("user") or result.get("usuario") or result.get("data") or None
        redirect = result.get("redirect")
        token = result.get("token")
        expires_in = result.get("expiresIn") or result.get("expires_in") or None

        serialized_user = _serialize_user_for_response(user) or None

        resp_payload = {}
        if serialized_user is not None:
            resp_payload["user"] = serialized_user
        if redirect:
            resp_payload["redirect"] = redirect
        # siempre incluir token explícitamente (puede ser null)
        resp_payload["token"] = token
        if expires_in:
            resp_payload["expiresIn"] = expires_in

        # Log de auditoría mínimo
        try:
            rol = serialized_user.get("rol") if serialized_user else None
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
    """
    Endpoint opcional. En el flujo mínimo actual el frontend mantiene sesión localmente.
    /me queda como placeholder y retorna 401 por defecto para indicar ausencia de sesión server-side.
    """
    return jsonify({"error": "no authenticated"}), 401

@app.route('/logout', methods=['POST'])
def logout():
    """
    En el flujo mínimo el frontend borra localStorage; backend no mantiene sesión.
    Devolvemos OK por compatibilidad.
    """
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
