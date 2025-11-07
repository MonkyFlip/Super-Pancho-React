# main.py (actualizado)
import os
import logging
import threading
import atexit
from flask import Flask, request, make_response
from flask_cors import CORS

# Carga variables de entorno
from dotenv import load_dotenv
load_dotenv()

# -----------------------
# Imports internos
# -----------------------
from db.conexion import get_db
from controllers.regresion_lineal import bp as regresion_bp
from controllers.regresion_lineal.actualiza_fecha_ordinal import run_migration
from api import bp as api_bp  # Explorador /api interactivo

# --- Spark ---
from controllers.spark.routes import api_bp as spark_bp
from controllers.spark.spark_config import get_spark_session, stop_spark

# --- NUEVO: Import de rutas principales ---
from routes import main_bp

# --- Import del CRUDS ---
from controllers.usuarios.routes import usuarios_bp 
from controllers.productos.productos_controller import productos_bp

# -----------------------
# App y configuración
# -----------------------
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "clave_insegura_dev")
app.config['GET_DB'] = get_db

# CORS
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

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("API iniciada. JWT secret configurado: %s", bool(os.environ.get("JWT_SECRET")))

# -----------------------
# Registrar Blueprints
# -----------------------
app.register_blueprint(main_bp)      # <-- NUEVO: Rutas principales
app.register_blueprint(regresion_bp)   # /regresion
app.register_blueprint(api_bp)         # /api (explorador)
app.register_blueprint(spark_bp, url_prefix='/api')  # /api/analisis (Spark)
app.register_blueprint(usuarios_bp)
app.register_blueprint(productos_bp)

# -----------------------
# Migración en background
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

start_background_migration()

# -----------------------
# Hook global (CORS)
# -----------------------
@app.before_request
def handle_options_preflight():
    if request.method == 'OPTIONS':
        return make_response('', 200)

# -----------------------
# MAIN
# -----------------------
if __name__ == "__main__":
    try:
        # Inicializa Spark antes de levantar Flask
        get_spark_session()
        atexit.register(stop_spark)
        port = int(os.environ.get("PORT", 5000))
        debug = os.environ.get("FLASK_DEBUG", "1") == "1"
        print(f"🌐 API unificada disponible en http://localhost:{port}")
        print(f"   -> Spark en /api/analisis")
        app.run(host='0.0.0.0', port=port, debug=debug)
    except Exception as e:
        print(f"❌ No se pudo iniciar la aplicación: {e}")
        stop_spark()