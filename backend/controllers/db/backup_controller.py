import os
import logging
import tempfile
import zipfile
import gridfs
from datetime import datetime
from bson import json_util, ObjectId
from flask import Blueprint, jsonify, send_file, Response

# Imports de tu proyecto
from db.conexion import get_db 

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

backup_bp = Blueprint('backups', __name__)

# Nombre de la base de datos donde guardaremos los ZIPS
BACKUP_DB_NAME = "superpancho_backups"

def _get_backup_fs():
    """
    Obtiene la instancia de GridFS conectada a la base de datos de backups.
    Reutiliza el cliente de conexión principal.
    """
    db_principal = get_db()
    if db_principal is None:
        raise RuntimeError("No hay conexión a la base de datos principal")
    
    # Obtenemos el cliente (la conexión general) del objeto db
    client = db_principal.client
    # Seleccionamos la base de datos dedicada a backups
    backup_db = client[BACKUP_DB_NAME]
    # Retornamos la instancia de GridFS
    return gridfs.GridFS(backup_db)

def _prune_old_backups_gridfs(fs, keep: int = 3):
    """
    Elimina los backups antiguos de GridFS, manteniendo solo los 'keep' más recientes.
    """
    try:
        # Buscar todos los archivos, ordenados por fecha de subida descendente
        # fs.find() retorna un cursor
        files = list(fs.find().sort("uploadDate", -1))
        
        if len(files) > keep:
            to_delete = files[keep:]
            for f in to_delete:
                try:
                    fs.delete(f._id)
                    logger.info("Backup antiguo eliminado de DB: %s", f.filename)
                except Exception as e:
                    logger.warning("Error eliminando backup %s: %s", f.filename, e)
            return [f.filename for f in to_delete]
    except Exception as e:
        logger.exception("Error podando backups en GridFS: %s", e)
    return []

def crear_backup_en_db(keep_last: int = 3):
    db = get_db()
    if db is None:
        raise RuntimeError("Error de conexión a DB")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"backup_{timestamp}.zip"
    summary = {}

    # 1. Crear ZIP en una carpeta temporal (se borra al terminar el 'with')
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            coll_names = db.list_collection_names()
            for coll in coll_names:
                cursor = db[coll].find({})
                file_path = os.path.join(tmpdir, f"{coll}.json")
                count = 0
                with open(file_path, "w", encoding="utf-8") as fh:
                    for doc in cursor:
                        fh.write(json_util.dumps(doc) + "\n")
                        count += 1
                summary[coll] = count
        except Exception as e:
            logger.exception("Error exportando datos: %s", e)
            raise e

        # Crear el archivo ZIP dentro del directorio temporal
        zip_path = os.path.join(tmpdir, zip_name)
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for fname in os.listdir(tmpdir):
                if fname.endswith(".json"):
                    full = os.path.join(tmpdir, fname)
                    zf.write(full, arcname=fname)

        # 2. Subir el ZIP a MongoDB (GridFS)
        fs = _get_backup_fs()
        with open(zip_path, 'rb') as f:
            # put() guarda el archivo y retorna el file_id
            file_id = fs.put(f, filename=zip_name, created_at=datetime.now())
            logger.info("Backup guardado en GridFS con ID: %s", file_id)

    # 3. Limpiar backups viejos
    deleted = _prune_old_backups_gridfs(fs, keep=keep_last)

    return {
        "filename": zip_name,
        "file_id": str(file_id),
        "collections": summary,
        "deleted_old": deleted
    }

# --- RUTAS ---

@backup_bp.route('/generar', methods=['POST'])
def endpoint_crear_backup():
    """ Genera backup y lo guarda en MongoDB """
    try:
        res = crear_backup_en_db()
        return jsonify({"ok": True, "data": res}), 200
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500

@backup_bp.route('/listar', methods=['GET'])
def endpoint_listar_backups():
    """ Lista los backups almacenados en GridFS """
    try:
        fs = _get_backup_fs()
        # Obtenemos archivos ordenados por fecha
        files_cursor = fs.find().sort("uploadDate", -1)
        
        lista = []
        for f in files_cursor:
            lista.append({
                "id": str(f._id), # Convertir ObjectId a string
                "filename": f.filename,
                "size": f.length,
                "date": f.uploadDate.isoformat()
            })
            
        return jsonify({"ok": True, "backups": lista}), 200
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500

@backup_bp.route('/descargar/<file_id>', methods=['GET'])
def endpoint_descargar_backup(file_id):
    """ Descarga un backup específico desde GridFS """
    try:
        fs = _get_backup_fs()
        if not ObjectId.is_valid(file_id):
            return jsonify({"ok": False, "message": "ID inválido"}), 400

        # Obtener el archivo de GridFS
        grid_out = fs.get(ObjectId(file_id))
        
        # Usar send_file para transmitir el archivo binario al navegador
        return send_file(
            grid_out,
            mimetype='application/zip',
            as_attachment=True,
            download_name=grid_out.filename
        )
    except gridfs.errors.NoFile:
        return jsonify({"ok": False, "message": "Archivo no encontrado"}), 404
    except Exception as e:
        logger.error(f"Error descargando: {e}")
        return jsonify({"ok": False, "message": str(e)}), 500