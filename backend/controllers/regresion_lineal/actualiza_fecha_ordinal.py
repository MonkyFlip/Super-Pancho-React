# controllers/regresion_lineal/actualiza_fecha_ordinal.py
"""
Script/módulo para poblar campo `fecha_ordinal` en colecciones que tengan `fecha`.
Funciones:
 - run_migration(get_db_fn, collections_filter=None, batch_size=1000, create_index=False, dry_run=False)
 - ejecución directa cuando se llama como __main__ (usa db.conexion.get_db)

Notas:
 - Está diseñado para correr en background desde main.py o manualmente en CLI.
 - Maneja distintos formatos de fecha (datetime, epoch numérico, ISO string). Usa dateutil si está disponible.
"""
from datetime import datetime
import time
import traceback

try:
    from dateutil import parser as _dateutil_parser
except Exception:
    _dateutil_parser = None

def _parse_to_epoch(value):
    """Intento robusto de convertir value a epoch (segundos). Devuelve int o None."""
    if value is None:
        return None
    # ya es numérico (epoch en segundos o ms)
    if isinstance(value, (int, float)):
        try:
            v = int(value)
            # detectar epoch en milisegundos y normalizar a segundos
            if v > 10**12:
                return int(v / 1000)
            return v
        except Exception:
            return None
    # datetime
    if isinstance(value, datetime):
        try:
            return int(value.timestamp())
        except Exception:
            return None
    # string: intentar ISO / parse leniente
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        # quitar Z final para fromisoformat
        s2 = s[:-1] if s.endswith('Z') else s
        try:
            # fromisoformat maneja offsets en py>=3.7 salvo sufijo Z
            dt = datetime.fromisoformat(s2)
            return int(dt.timestamp())
        except Exception:
            # fallback dateutil si disponible
            if _dateutil_parser:
                try:
                    dt = _dateutil_parser.isoparse(s)
                    return int(dt.timestamp())
                except Exception:
                    pass
            # intento heurístico: parsear como int
            try:
                v = int(s)
                if v > 10**12:
                    return int(v/1000)
                return v
            except Exception:
                return None
    return None

def run_migration(get_db_fn, collections_filter=None, batch_size=1000, create_index=False, dry_run=False, logger=None):
    """
    Ejecuta la migración que añade fecha_ordinal donde exista 'fecha' y no exista 'fecha_ordinal'.
    Parámetros:
      - get_db_fn: callable que devuelve la conexión a la DB (ej: app.config['GET_DB'] o db.conexion.get_db)
      - collections_filter: iterable de nombres de colecciones a procesar (None = todas)
      - batch_size: tamaño de batch para cursores y reporting
      - create_index: si True, crea index {fecha_ordinal:1} en cada colección procesada al final
      - dry_run: si True, no escribe en la DB; solo cuenta y reporta
      - logger: objeto con .info/.warning/.error; si None usa print
    Retorna un dict resumen.
    """
    log = logger or None
    def _info(*args):
        if log:
            try: log.info(*args); return
            except Exception: pass
        print(*args)
    def _warn(*args):
        if log:
            try: log.warning(*args); return
            except Exception: pass
        print("WARN:", *args)
    def _err(*args):
        if log:
            try: log.error(*args); return
            except Exception: pass
        print("ERROR:", *args)

    db = None
    try:
        db = get_db_fn()
    except Exception as e:
        _err("No se pudo obtener conexión a DB:", e)
        return {"ok": False, "error": "DB no disponible", "detail": str(e)}

    if db is None:
        _err("DB getter devolvió None")
        return {"ok": False, "error": "DB no disponible"}

    coll_names = list(db.list_collection_names())
    if collections_filter:
        coll_names = [c for c in coll_names if c in collections_filter]

    summary = {"ok": True, "total_updated": 0, "details": {}}

    for coll in coll_names:
        try:
            query = {"fecha": {"$exists": True}, "fecha_ordinal": {"$exists": False}}
            count_candidates = db[coll].count_documents(query)
            if count_candidates == 0:
                _info(f"{coll}: no hay documentos pendientes ({count_candidates})")
                continue

            _info(f"{coll}: candidatos a actualizar = {count_candidates}")
            updated = 0
            processed = 0

            cursor = db[coll].find(query, {"fecha": 1}).batch_size(batch_size)
            for doc in cursor:
                processed += 1
                try:
                    epoch = _parse_to_epoch(doc.get("fecha"))
                    if epoch is None:
                        # no se puede parsear, lo registramos y saltamos
                        _warn(f"{coll}: no parseable fecha en _id={doc.get('_id')}, valor={doc.get('fecha')}")
                        continue
                    if dry_run:
                        updated += 1
                    else:
                        res = db[coll].update_one({"_id": doc["_id"]}, {"$set": {"fecha_ordinal": int(epoch)}})
                        if res.modified_count:
                            updated += 1
                except Exception:
                    _err(f"{coll}: error procesando doc _id={doc.get('_id')}\n{traceback.format_exc()}")
                    continue

                # logging periódico para procesos largos
                if processed % batch_size == 0:
                    _info(f"{coll}: procesados {processed}, actualizados {updated}")

            _info(f"{coll}: finalizados processed={processed}, updated={updated}")
            summary["details"][coll] = {"processed": processed, "updated": updated}
            summary["total_updated"] += updated

            if create_index and not dry_run and updated > 0:
                try:
                    db[coll].create_index([("fecha_ordinal", 1)])
                    _info(f"{coll}: índice fecha_ordinal creado")
                except Exception as e:
                    _warn(f"{coll}: no se pudo crear índice fecha_ordinal: {e}")

        except Exception:
            _err(f"{coll}: error general en migración:\n{traceback.format_exc()}")
            summary["details"][coll] = {"error": "exception", "trace": traceback.format_exc()}

    return summary

# Permitir ejecución directa desde CLI (usa db.conexion.get_db)
if __name__ == "__main__":
    try:
        from db.conexion import get_db
    except Exception as e:
        print("No se pudo importar get_db desde db.conexion:", e)
        raise

    import argparse
    parser = argparse.ArgumentParser(description="Poblar campo fecha_ordinal desde fecha (migración).")
    parser.add_argument("--collections", "-c", nargs="+", help="Lista de colecciones a procesar (por defecto: todas)")
    parser.add_argument("--batch", "-b", type=int, default=1000, help="Tamaño de batch para cursor")
    parser.add_argument("--index", action="store_true", help="Crear índice {fecha_ordinal:1} al final en colecciones procesadas")
    parser.add_argument("--dry-run", action="store_true", help="No escribir en la DB, solo contar y reportar")
    args = parser.parse_args()

    print("Iniciando migración fecha_ordinal (CLI)...")
    start = time.time()
    res = run_migration(get_db, collections_filter=args.collections, batch_size=args.batch, create_index=args.index, dry_run=args.dry_run, logger=None)
    elapsed = time.time() - start
    print("Resultado:", res)
    print(f"Tiempo transcurrido: {elapsed:.2f}s")
