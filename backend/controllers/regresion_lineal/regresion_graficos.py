# controllers/regresion_lineal/regresion_graficos.py
from flask import Blueprint, request, current_app, jsonify
from bson import json_util
import json
import datetime
import traceback

bp = Blueprint('regresion', __name__, url_prefix='/regresion')

def _serialize(obj):
    try:
        return json.loads(json_util.dumps(obj))
    except Exception:
        try:
            return json.loads(json.dumps(obj))
        except Exception:
            return str(obj)

def _bad(msg: str):
    return jsonify({"ok": False, "error": msg}), 400

def _to_epoch_loose(value):
    """Intento robusto de convertir value a epoch (segundos). Devuelve int o None."""
    if value is None:
        return None
    # numérico
    if isinstance(value, (int, float)):
        try:
            return int(value)
        except Exception:
            return None
    # datetime
    if isinstance(value, datetime.datetime):
        try:
            return int(value.timestamp())
        except Exception:
            return None
    # string: intentar ISO parse
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        # quitar sufijo Z para fromisoformat si existe
        s2 = s[:-1] if s.endswith('Z') else s
        try:
            dt = datetime.datetime.fromisoformat(s2)
            return int(dt.timestamp())
        except Exception:
            # fallback a dateutil si está disponible
            try:
                from dateutil import parser as _parser
                dt = _parser.isoparse(s)
                return int(dt.timestamp())
            except Exception:
                return None
    return None

@bp.route('/simple', methods=['POST'])
def regresion_simple():
    """
    Soporta:
      - samples mode: { samples: { x: [...], y: [...] } }
      - collection mode: { collection, x_field, y_field, limit }
    Convierte fechas ISO a epoch on-the-fly si x_field apunta a un campo de fecha.
    """
    try:
        body = request.get_json(silent=True)
        current_app.logger.info("POST /regresion/simple body: %s", body)
        if not body:
            return _bad("Request body vacío o no es JSON")

        # samples mode
        if "samples" in body:
            samples = body.get("samples")
            if not isinstance(samples, dict):
                return _bad("samples debe ser un objeto con keys 'x' y 'y'")
            xs = samples.get("x") or []
            ys = samples.get("y") or []
            if not isinstance(xs, list) or not isinstance(ys, list):
                return _bad("samples.x y samples.y deben ser arrays")
            if len(xs) != len(ys):
                return _bad("samples.x y samples.y deben tener la misma longitud")
            try:
                xs_n = [float(v) for v in xs]
                ys_n = [float(v) for v in ys]
            except Exception:
                return _bad("samples.x / samples.y deben contener valores numéricos")
            n = len(xs_n)
            if n < 2:
                return _bad("Se requieren al menos 2 muestras")
            mean_x = sum(xs_n) / n
            mean_y = sum(ys_n) / n
            num = sum((xs_n[i]-mean_x)*(ys_n[i]-mean_y) for i in range(n))
            den = sum((xs_n[i]-mean_x)**2 for i in range(n))
            coef = 0.0 if den == 0 else num/den
            intercept = mean_y - coef * mean_x
            y_pred = [intercept + coef * x for x in xs_n]
            return jsonify({
                "ok": True, "mode": "samples", "n": n,
                "intercept": intercept, "coef": coef, "r2": None,
                "samples": {"x": xs_n, "y": ys_n, "y_pred": y_pred}
            }), 200

        # collection mode
        collection = body.get("collection")
        x_field = body.get("x_field")
        y_field = body.get("y_field")
        limit = int(body.get("limit") or 1000)
        if not collection or not x_field or not y_field:
            return _bad("Faltan parámetros: collection, x_field y y_field son requeridos cuando no se envían samples")

        db = current_app.config.get('GET_DB')()
        if db is None:
            return _bad("DB no disponible")
        if collection not in db.list_collection_names():
            return _bad(f"Colección '{collection}' no encontrada en DB")

        # muestreo inicial para diagnóstico
        try:
            sample_docs = list(db[collection].find({}, {x_field:1, y_field:1}).limit(6))
            current_app.logger.info("Regresion collection sample_docs (first up to 6): %s", _serialize(sample_docs))
        except Exception as e:
            current_app.logger.exception("Error al leer sample_docs: %s", e)
            sample_docs = []

        xs = []
        ys = []
        skipped = 0
        cursor = db[collection].find({}, {x_field: 1, y_field: 1}).limit(max(1, min(limit, 20000)))
        for doc in cursor:
            xv = doc.get(x_field)
            yv = doc.get(y_field)

            xv_conv = _to_epoch_loose(xv)
            try:
                yv_conv = float(yv)
            except Exception:
                yv_conv = None

            if xv_conv is None or yv_conv is None:
                skipped += 1
                continue

            xs.append(float(xv_conv))
            ys.append(float(yv_conv))

        current_app.logger.info("Regresion extracted counts: kept=%s skipped=%s", len(xs), skipped)

        if len(xs) < 2:
            return _bad(f"No hay suficientes datos numéricos: encontrados {len(xs)} válidos, {skipped} omitidos. Revisa que '{x_field}' y '{y_field}' existan y sean convertibles a número; alternativamente envia samples o ejecuta la migración de fecha_ordinal.")

        n = len(xs)
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        num = sum((xs[i]-mean_x)*(ys[i]-mean_y) for i in range(n))
        den = sum((xs[i]-mean_x)**2 for i in range(n))
        coef = 0.0 if den == 0 else num/den
        intercept = mean_y - coef * mean_x
        y_pred = [intercept + coef * x for x in xs]

        return jsonify({
            "ok": True, "mode": "collection", "collection": collection, "n": n,
            "intercept": intercept, "coef": coef, "r2": None,
            "samples": {"x": xs, "y": ys, "y_pred": y_pred}
        }), 200

    except Exception as exc:
        current_app.logger.exception("Error en /regresion/simple: %s", exc)
        return jsonify({"ok": False, "error": "Error interno al procesar regresión", "detail": str(exc)}), 500


@bp.route('/multiple', methods=['POST'])
def regresion_multiple():
    """
    Soporta:
      - samples: [ { x: {f1:..}, y: number }, ... ]
      - collection: { collection, features: [...], target, limit }
    Se añade soporte flexible para:
      - features derivadas: items_count, sum_precio, avg_precio
      - features dentro de arrays con notación 'productos.FIELD' (agrega vía suma)
      - campos simples al nivel del documento
    Respuesta incluye filas X_matrix opcional para facilitar mapeo en frontend.
    """
    try:
        body = request.get_json(silent=True)
        current_app.logger.info("POST /regresion/multiple body: %s", body)
        if not body:
            return _bad("Request body vacío o no es JSON")

        # samples list mode
        if "samples" in body:
            samples = body.get("samples")
            if not isinstance(samples, list) or not samples:
                return _bad("samples debe ser un array de ejemplos {x:{...}, y: number}")
            features = list(samples[0].get("x", {}).keys())
            X = []
            y = []
            for s in samples:
                xv = s.get("x", {})
                try:
                    row = [float(xv.get(f, 0)) for f in features]
                    X.append([1.0] + row)
                    y.append(float(s.get("y")))
                except Exception:
                    return _bad("Todos los features y y deben ser numéricos en samples")
            try:
                import numpy as _np
                Xt = _np.array(X)
                yt = _np.array(y).reshape(-1,1)
                coef_vec = _np.linalg.pinv(Xt.T.dot(Xt)).dot(Xt.T).dot(yt).flatten()
                intercept = float(coef_vec[0])
                coefs = {features[i]: float(coef_vec[i+1]) for i in range(len(features))}
                y_pred = (Xt.dot(coef_vec.reshape(-1,1)).flatten()).tolist()
            except Exception:
                return _bad("Regresión múltiple requiere numpy en el entorno para cálculos (instala numpy)")
            return jsonify({
                "ok": True, "n": len(y), "intercept": intercept, "coef": coefs, "r2": None,
                "samples": {"y": y, "y_pred": y_pred}, "features": features
            }), 200

        # collection mode
        collection = body.get("collection")
        features = body.get("features")
        target = body.get("target")
        limit = int(body.get("limit") or 1000)
        if not collection or not features or not target:
            return _bad("Faltan parámetros: collection, features y target son requeridos cuando no se envían samples")
        if not isinstance(features, list) or not features:
            return _bad("features debe ser un array no vacío")

        db = current_app.config.get('GET_DB')()
        if db is None:
            return _bad("DB no disponible")
        if collection not in db.list_collection_names():
            return _bad(f"Colección '{collection}' no encontrada en DB")

        rows = []
        y_vals = []
        x_matrix = []  # conservar valores originales por fila para frontend si se desea
        cursor = db[collection].find().limit(max(1, min(limit, 20000)))
        for doc in cursor:
            row_vals = []
            skip = False
            for f in features:
                # features derivadas conocidas
                if f == "items_count":
                    v = len(doc.get("productos") or [])
                elif f == "sum_precio":
                    s = 0.0
                    for p in doc.get("productos") or []:
                        try:
                            s += float(p.get("precio", 0)) * int(p.get("cantidad", 1))
                        except Exception:
                            pass
                    v = s
                elif f == "avg_precio":
                    cnt = len(doc.get("productos") or [])
                    s = 0.0
                    for p in doc.get("productos") or []:
                        try:
                            s += float(p.get("precio", 0)) * int(p.get("cantidad", 1))
                        except Exception:
                            pass
                    v = (s / cnt) if cnt else 0.0
                # soporte para features con notación productos.FIELD (ej: productos.precio)
                elif isinstance(f, str) and f.startswith("productos."):
                    fld = f.split(".", 1)[1]
                    vals = []
                    for p in doc.get("productos") or []:
                        try:
                            val = p.get(fld)
                            if val is None:
                                continue
                            vals.append(float(val))
                        except Exception:
                            continue
                    # agregación por suma; si necesitas promedio cambia la siguiente línea
                    v = sum(vals) if vals else 0.0
                else:
                    # campo simple al nivel del documento (fallback)
                    try:
                        raw = doc.get(f, None)
                        if raw is None:
                            v = 0.0
                        else:
                            v = float(raw)
                    except Exception:
                        v = None
                if v is None:
                    skip = True
                    break
                row_vals.append(float(v))
            # target
            try:
                yv = float(doc.get(target, 0))
            except Exception:
                skip = True
            if skip:
                continue
            rows.append([1.0] + row_vals)
            x_matrix.append(row_vals)
            y_vals.append(yv)

        current_app.logger.info("Regresion multiple extracted: rows=%s features=%s", len(rows), features)

        if len(rows) < len(features) + 1:
            return _bad("No hay suficientes filas válidas para resolver regresión múltiple con las features solicitadas")

        try:
            import numpy as _np
            Xt = _np.array(rows)
            yt = _np.array(y_vals).reshape(-1,1)
            coef_vec = _np.linalg.pinv(Xt.T.dot(Xt)).dot(Xt.T).dot(yt).flatten()
            intercept = float(coef_vec[0])
            coefs = {features[i]: float(coef_vec[i+1]) for i in range(len(features))}
            y_pred = (Xt.dot(coef_vec.reshape(-1,1)).flatten()).tolist()
        except Exception:
            current_app.logger.exception("Error en cálculo numpy")
            return _bad("Regresión múltiple requiere numpy en el entorno para cálculos (instala numpy)")

        return jsonify({
            "ok": True, "mode": "collection", "collection": collection, "n": len(rows),
            "intercept": intercept, "coef": coefs, "r2": None,
            "samples": {"y": y_vals, "y_pred": y_pred, "X_matrix": x_matrix}, "features": features
        }), 200

    except Exception as exc:
        current_app.logger.exception("Error en /regresion/multiple: %s", traceback.format_exc())
        return jsonify({"ok": False, "error": "Error interno al procesar regresión múltiple", "detail": str(exc)}), 500
