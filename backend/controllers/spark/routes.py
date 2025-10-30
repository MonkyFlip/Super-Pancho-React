from flask import Blueprint, jsonify
# --- Import relativo actualizado ---
from .analysis import run_spark_analysis

# Creamos un Blueprint. Esto nos permite definir rutas en un archivo separado
# y luego "registrarlas" en nuestra app principal (app.py).
api_bp = Blueprint('api', __name__)

@api_bp.route("/analisis", methods=["GET"])
def api_analisis():
    """
    Endpoint principal que ejecuta el análisis de Spark y devuelve los resultados.
    """
    try:
        # Llama a la función de lógica de negocio desde analysis.py
        resultados = run_spark_analysis()
        return jsonify(resultados), 200
    except Exception as e:
        # Manejo de errores centralizado
        print(f"Error en el endpoint /analisis: {str(e)}")
        return jsonify({"error": str(e)}), 500
