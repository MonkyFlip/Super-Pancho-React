# backup_controller.py
"""
Funciones para crear un backup completo de la base de datos MongoDB y mantener solo los 3 backups más recientes.
Diseñado para ser invocado desde el frontend (endpoint administrativo).
Comportamiento:
 - Obtiene la instancia Database usando get_db_callable.
 - Exporta cada colección a un archivo JSON usando bson.json_util para preservar tipos BSON.
 - Agrupa los archivos en un ZIP llamado "backup_YYYYmmdd_HHMMSS.zip" dentro de la carpeta ../db/backups (relativa a este archivo).
 - Mantiene únicamente los 3 backups más recientes; elimina los más antiguos.
 - Retorna la ruta absoluta al ZIP creado, resumen por colección y lista de backups eliminados.
"""
from typing import Callable, Dict, Any, List
import os
import json
from datetime import datetime
from bson import json_util
import logging
import tempfile
import zipfile

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def _default_backups_dir() -> str:
    here = os.path.dirname(__file__)
    backups_dir = os.path.abspath(os.path.join(here, "..", "db", "backups"))
    return backups_dir


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _prune_old_backups(backups_dir: str, keep: int = 3) -> List[str]:
    """
    Mantiene solo los 'keep' backups más recientes en backups_dir.
    Devuelve la lista de rutas eliminadas.
    """
    deleted: List[str] = []
    try:
        files = [
            os.path.join(backups_dir, f)
            for f in os.listdir(backups_dir)
            if os.path.isfile(os.path.join(backups_dir, f)) and f.startswith("backup_") and f.endswith(".zip")
        ]
        # Ordenar por tiempo de modificación, descendente (más recientes primero)
        files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
        # Archivos a eliminar: desde index 'keep' en adelante
        to_delete = files[keep:]
        for path in to_delete:
            try:
                os.remove(path)
                deleted.append(path)
                logger.info("Backup antiguo eliminado: %s", path)
            except Exception as e:
                logger.warning("No se pudo eliminar backup %s: %s", path, e)
    except FileNotFoundError:
        # carpeta no existe: nada que podar
        return deleted
    except Exception as e:
        logger.exception("Error al podar backups: %s", e)
    return deleted


def crear_backup(get_db_callable: Callable[[], Any], backups_dir: str = None, keep_last: int = 3) -> Dict[str, Any]:
    """
    Crea un backup completo de la base de datos y poda backups antiguos.
    Parámetros:
      - get_db_callable: callable que retorna una instancia pymongo Database
      - backups_dir: ruta opcional donde guardar el ZIP; por defecto ../db/backups
      - keep_last: cantidad de backups recientes a mantener (por defecto 3)
    Retorna:
      {
        "backup_path": "/abs/path/backup_YYYYmmdd_HHMMSS.zip",
        "collections": {"usuarios": 123, "productos": 456, ...},
        "created_at": "ISO timestamp",
        "deleted_backups": ["/abs/path/backup_YYYYmmdd_HHMMSS.zip", ...]
      }
    Lanza RuntimeError en caso de fallo crítico.
    """
    if backups_dir is None:
        backups_dir = _default_backups_dir()

    _ensure_dir(backups_dir)

    db = get_db_callable()
    if db is None:
        raise RuntimeError("get_db_callable retornó None")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    zip_name = f"backup_{timestamp}.zip"
    zip_path = os.path.join(backups_dir, zip_name)

    with tempfile.TemporaryDirectory() as tmpdir:
        summary = {}
        try:
            coll_names = db.list_collection_names()
        except Exception as e:
            logger.exception("No se pudo listar colecciones: %s", e)
            raise RuntimeError(f"No se pudo listar colecciones: {e}")

        for coll in coll_names:
            try:
                cursor = db[coll].find({})
                file_path = os.path.join(tmpdir, f"{coll}.json")
                count = 0
                with open(file_path, "w", encoding="utf-8") as fh:
                    for doc in cursor:
                        fh.write(json_util.dumps(doc) + "\n")
                        count += 1
                summary[coll] = count
                logger.info("Exportada colección %s (%d docs)", coll, count)
            except Exception as e:
                logger.exception("Error exportando colección %s: %s", coll, e)
                summary[coll] = {"error": str(e)}

        try:
            with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                for fname in os.listdir(tmpdir):
                    full = os.path.join(tmpdir, fname)
                    zf.write(full, arcname=fname)
            logger.info("Backup creado en %s", zip_path)
        except Exception as e:
            logger.exception("Error creando ZIP de backup: %s", e)
            raise RuntimeError(f"Error creando ZIP de backup: {e}")

    deleted = _prune_old_backups(backups_dir, keep=keep_last)

    result = {
        "backup_path": zip_path,
        "collections": summary,
        "created_at": datetime.timezone.utc().isoformat() + "Z",
        "deleted_backups": deleted
    }
    return result
