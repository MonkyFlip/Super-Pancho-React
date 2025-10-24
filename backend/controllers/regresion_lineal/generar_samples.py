# controllers/regresion_lineal/generar_samples.py
from db.conexion import get_db
import os, requests, json

def generar_samples_ventas(limit=5000):
    db = get_db()
    cursor = db['ventas'].find({}, {"productos":1,"total":1,"fecha_ordinal":1,"fecha":1}).limit(limit)
    simple = {"x": [], "y": []}
    multiple = []
    for d in cursor:
        total = float(d.get("total") or 0)
        # preferir fecha_ordinal si existe, sino intentar parsear fecha (no write)
        if d.get("fecha_ordinal") is not None:
            simple["x"].append(float(d["fecha_ordinal"]))
            simple["y"].append(total)
        else:
            fecha = d.get("fecha")
            if fecha:
                try:
                    from datetime import datetime
                    if isinstance(fecha, str):
                        dt = datetime.fromisoformat(fecha.rstrip('Z'))
                    else:
                        dt = fecha
                    simple["x"].append(float(int(dt.timestamp())))
                    simple["y"].append(total)
                except Exception:
                    pass
        productos = d.get("productos") or []
        cnt = len(productos)
        s = 0.0
        for p in productos:
            try:
                s += float(p.get("precio", 0)) * int(p.get("cantidad", 1))
            except Exception:
                pass
        avg = (s / cnt) if cnt else 0.0
        multiple.append({"x": {"items_count": cnt, "sum_precio": s, "avg_precio": avg}, "y": total})
    return {"simple": simple, "multiple": multiple}

if __name__ == "__main__":
    res = generar_samples_ventas(2000)
    print("Samples simple count:", len(res["simple"]["x"]))
