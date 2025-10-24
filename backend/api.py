# backend/api.py
from flask import Blueprint, current_app, jsonify, request, make_response
from bson import json_util
import json

bp = Blueprint('api_explorer', __name__, url_prefix='/api')

# Util: obtener instancia de DB desde current_app.config['GET_DB']
def _get_db():
    get_db_callable = current_app.config.get('GET_DB')
    if callable(get_db_callable):
        return get_db_callable()
    return None

def _serialize(obj):
    try:
        return json.loads(json_util.dumps(obj))
    except Exception:
        try:
            return json.loads(json.dumps(obj))
        except Exception:
            return str(obj)

# Lista de endpoints públicos / descripciones (útil para el menú)
ENDPOINTS_META = [
    {"path": "/api", "method": "GET", "desc": "Interfaz interactiva del API (esta página)"},
    {"path": "/api/colecciones", "method": "GET", "desc": "Lista los nombres de las colecciones en la DB"},
    {"path": "/api/coleccion/<nombre>?limit=50", "method": "GET", "desc": "Muestra una muestra de documentos de una colección"},
    {"path": "/api/endpoints", "method": "GET", "desc": "Lista programática de los endpoints disponibles (JSON)"},
    {"path": "/regresion/simple", "method": "POST", "desc": "Regresión lineal simple; acepta samples inline o parámetros para extraer desde DB"},
    {"path": "/regresion/multiple", "method": "POST", "desc": "Regresión lineal múltiple; acepta samples inline o parámetros para extraer desde DB"},
    {"path": "/verifica_db", "method": "GET", "desc": "Verifica que la DB y colecciones mínimas estén disponibles"},
    {"path": "/crear_db", "method": "POST", "desc": "Crear/poblar la base de datos (control administrativo)"},
    {"path": "/multimedia/archivos?tipo=imagen&page=1&limit=20", "method": "GET", "desc": "Listar archivos multimedia (GridFS) por tipo"},
    {"path": "/multimedia/archivo/<id>", "method": "GET", "desc": "Descargar / mostrar archivo almacenado en GridFS"}
]

@bp.route('/', methods=['GET'])
def index():
    base = request.host_url.rstrip('/')
    # construir filas de endpoints de forma segura
    rows_html = []
    for e in ENDPOINTS_META:
        path = e.get('path', '')
        method = e.get('method', '')
        desc = e.get('desc', '')
        url = f"{base}{path}"
        rows_html.append(
            "<tr>"
            f"<td><a class='endpoint' href='{url}' target='_blank'>{path}</a></td>"
            f"<td>{method}</td>"
            f"<td>{desc}</td>"
            "</tr>"
        )
    rows_html = "".join(rows_html)

    # plantilla HTML con placeholders y llaves dobles protegidas
    html_tpl = """
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>API Explorer</title>
        <style>
          body {{ font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; background:#f4f6fb; color:#0f1720; padding:20px; }}
          .wrap {{ max-width:1100px; margin:12px auto; }}
          .card {{ background:#fff; border-radius:12px; padding:16px; box-shadow:0 10px 30px rgba(16,24,40,0.06); margin-bottom:12px; }}
          h1 {{ margin:0 0 8px 0; font-size:20px; }}
          .controls button {{ margin:6px 8px 6px 0; padding:8px 12px; border-radius:8px; border:1px solid #e6eefc; background:#fff; cursor:pointer; }}
          pre {{ background:#0b1220; color:#e6eefc; padding:12px; border-radius:8px; overflow:auto; max-height:420px; }}
          .muted {{ color:#6b7280; font-size:13px; }}
          table {{ width:100%; border-collapse:collapse; font-size:13px; }}
          th,td {{ padding:8px; border-bottom:1px solid #eef2ff; text-align:left; }}
          a.endpoint {{ color:#2563eb; text-decoration:none; font-weight:600; }}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <h1>API Explorer</h1>
            <div class="muted">Interfaz para explorar colecciones y endpoints disponibles en el backend</div>
            <div style="margin-top:12px;" class="controls">
              <button onclick="listarColecciones()">Listar colecciones</button>
              <button onclick="listarEndpoints()">Listar endpoints</button>
              <button onclick="verificaDB()">Verificar DB</button>
              <input id="coleccionInput" placeholder="nombre de colección" style="padding:8px;border-radius:8px;border:1px solid #e6eefc;margin-left:8px;width:220px"/>
              <button onclick="verColeccion()">Ver colección</button>
              <button onclick="limpiar()">Limpiar</button>
            </div>
          </div>

          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>Salida</strong>
              <span class="muted">Origen detectado: {origin}</span>
            </div>
            <pre id="out">Presiona "Listar colecciones" para comenzar.</pre>
          </div>

          <div class="card">
            <strong>Endpoints rápidos</strong>
            <table>
              <thead><tr><th>Ruta</th><th>Método</th><th>Descripción</th></tr></thead>
              <tbody>
                {rows}
              </tbody>
            </table>
          </div>
        </div>

        <script>
          const base = "{base}";
          async function doGet(path) {{
            const res = await fetch(path, {{ credentials: 'include' }});
            const txt = await res.text();
            try {{ return JSON.parse(txt); }} catch {{ return txt; }}
          }}

          async function listarColecciones() {{
            try {{
              const res = await fetch(base + '/api/colecciones');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}

          async function listarEndpoints() {{
            try {{
              const res = await fetch(base + '/api/endpoints');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}

          async function verColeccion() {{
            const name = (document.getElementById('coleccionInput').value || '').trim();
            if (!name) {{ document.getElementById('out').textContent = 'Indica un nombre de colección.'; return; }}
            try {{
              const res = await fetch(base + '/api/coleccion/' + encodeURIComponent(name) + '?limit=100');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}

          async function verificaDB() {{
            try {{
              const res = await fetch(base.replace('/api','') + '/verifica_db');
              const json = await res.json();
              document.getElementById('out').textContent = JSON.stringify(json, null, 2);
            }} catch (e) {{
              document.getElementById('out').textContent = 'Error: ' + e;
            }}
          }}

          function limpiar() {{ document.getElementById('out').textContent = ''; }}
        </script>
      </body>
    </html>
    """

    html = html_tpl.format(base=base, rows=rows_html, origin=(request.headers.get('Origin') or 'N/A'))
    resp = make_response(html, 200)
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    return resp

@bp.route('/colecciones', methods=['GET'])
def listar_colecciones():
    try:
        db = _get_db()
        if db is None:
            return jsonify({"ok": False, "error": "DB not available"}), 500
        names = db.list_collection_names()
        return jsonify({"ok": True, "colecciones": names}), 200
    except Exception as e:
        current_app.logger.exception("listar_colecciones error: %s", e)
        return jsonify({"ok": False, "error": str(e)}), 500

@bp.route('/coleccion/<string:nombre>', methods=['GET'])
def coleccion_sample(nombre):
    try:
        limit = int(request.args.get('limit') or 50)
        limit = max(1, min(limit, 1000))
    except Exception:
        limit = 50
    try:
        db = _get_db()
        if db is None:
            return jsonify({"error": "DB not available"}), 500
        if nombre not in db.list_collection_names():
            return jsonify({"error": f"Colección '{nombre}' no encontrada"}), 404
        cursor = db[nombre].find().limit(limit)
        docs = list(cursor)
        return jsonify({"ok": True, "coleccion": nombre, "count": len(docs), "docs": _serialize(docs)}), 200
    except Exception as e:
        current_app.logger.exception("coleccion_sample error: %s", e)
        return jsonify({"ok": False, "error": str(e)}), 500

@bp.route('/endpoints', methods=['GET'])
def endpoints():
    try:
        base = (request.host_url or '').rstrip('/')
        items = []
        for e in ENDPOINTS_META:
            items.append({**e, "url": base + e["path"]})
        return jsonify({"ok": True, "endpoints": items}), 200
    except Exception as e:
        current_app.logger.exception("endpoints error: %s", e)
        return jsonify({"ok": False, "error": str(e)}), 500
