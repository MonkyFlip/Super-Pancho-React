#ontrolador genérico para manejar multimedia
import gridfs
from flask import Blueprint, request, jsonify
from bson import ObjectId
from ...db.conexion import get_db

# Blueprint compartido
multimedia_bp = Blueprint("multimedia", __name__, url_prefix="/multimedia")

def _serialize_file(doc):
    """Convierte metadatos de GridFS a JSON."""
    return {
        "_id": str(doc._id),
        "filename": doc.filename,
        "length": doc.length,
        "uploadDate": doc.upload_date.isoformat() if doc.upload_date else None,
        "tipo": doc.metadata.get("tipo") if doc.metadata else None,
    }

# -----------------------------
# GET /multimedia/<tipo>
# -----------------------------
@multimedia_bp.route("/<string:tipo>", methods=["GET"])
def listar_multimedia(tipo):
    """Devuelve archivos del tipo especificado: 'foto', 'imagen', 'video'."""
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "DB no disponible"}), 500

        fs = gridfs.GridFS(db, collection="multimedia")

        # Parámetros de paginación
        limit = int(request.args.get("limit", 50))
        skip = int(request.args.get("skip", 0))

        cursor = fs.find({"metadata.tipo": tipo}).skip(skip).limit(limit)
        archivos = [_serialize_file(doc) for doc in cursor]
        total = db["multimedia.files"].count_documents({"metadata.tipo": tipo})

        return jsonify({
            "ok": True,
            "tipo": tipo,
            "count": len(archivos),
            "total": total,
            "docs": archivos
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# POST /multimedia/<tipo>/upload
# -----------------------------
@multimedia_bp.route("/<string:tipo>/upload", methods=["POST"])
def subir_multimedia(tipo):
    """Sube un archivo multimedia a GridFS con su tipo (foto, imagen, video)."""
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "DB no disponible"}), 500

        fs = gridfs.GridFS(db, collection="multimedia")

        if "file" not in request.files:
            return jsonify({"error": "No se envió ningún archivo"}), 400

        file = request.files["file"]
        nombre = file.filename

        file_id = fs.put(file, filename=nombre, metadata={"tipo": tipo})

        return jsonify({"ok": True, "id": str(file_id), "filename": nombre}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# GET /multimedia/file/<id>
# -----------------------------
@multimedia_bp.route("/file/<string:file_id>", methods=["GET"])
def obtener_archivo(file_id):
    """Descarga o muestra un archivo multimedia desde GridFS."""
    try:
        db = get_db()
        fs = gridfs.GridFS(db, collection="multimedia")
        archivo = fs.get(ObjectId(file_id))

        tipo = archivo.metadata.get("tipo", "desconocido")
        contenido = archivo.read()

        # Respuesta binaria directa
        from flask import Response
        mimetype = "image/jpeg" if tipo in ["foto", "imagen"] else "video/mp4"
        return Response(contenido, mimetype=mimetype)

    except Exception as e:
        return jsonify({"error": str(e)}), 404


# -----------------------------
# DELETE /multimedia/file/<id>
# -----------------------------
@multimedia_bp.route("/file/<string:file_id>", methods=["DELETE"])
def eliminar_archivo(file_id):
    """Elimina un archivo multimedia."""
    try:
        db = get_db()
        fs = gridfs.GridFS(db, collection="multimedia")
        fs.delete(ObjectId(file_id))
        return jsonify({"ok": True, "deleted": file_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
