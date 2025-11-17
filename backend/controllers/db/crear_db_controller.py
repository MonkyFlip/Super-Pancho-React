# ---------------------------------------------
# IMPORTACIONES
# ---------------------------------------------
from typing import Callable, Any, Dict, List, Tuple
from datetime import datetime, timedelta, timezone
import random
import logging
import bcrypt
from pymongo import ASCENDING, IndexModel

# --- Importaciones añadidas del script de multimedia ---
import io
import numpy as np
from PIL import Image
import cv2
import gridfs
import os
# ---------------------------------------------


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------
# CONFIGURACIÓN DE NÚMERO DE REGISTROS (#!MODIFICADO)
# ---------------------------------------------
# Este es el único lugar que necesitas editar para controlar
# el número de registros en toda la base de datos.

CONFIG_REGISTROS = {
    # --- Colecciones Principales ---
    # Nota: 'areas' debe ser al menos 11 y 'productos' al menos 16
    # para que los datos de ejemplo (seeds) se incluyan correctamente.
    
    "usuarios": 20,
    "areas": 11,
    "productos": 1000,
    "clientes": 500_000,
    "ventas": 500_000,
    "logs": 200_000,

    # --- Multimedia (GridFS) ---
    "imagenes_color": 10_000,
    "fotos_ruido": 10_000,
    "videos": 5_000
}

# ---------------------------------------------
# CONSTANTES PRINCIPALES
# ---------------------------------------------
# DEFAULT_TOTAL_RECORDS y MIN_TOTAL_RECORDS ya no son necesarios (#!MODIFICADO)
BATCH_SIZE = 5000

ROLES = ["administrador", "trabajador", "cliente"]
DEFAULT_PASSWORD = "1234"

# ---------------------------------------------
# CONSTANTES DE MULTIMEDIA (#!NUEVO)
# ---------------------------------------------
IMG_ANCHO, IMG_ALTO = 128, 128
VID_FPS = 10
VID_DURACION = 5  # segundos

# --- Cantidades de Multimedia ---
# Las constantes de conteo TOTAL_... se eliminaron (#!MODIFICADO)
# Ahora se leen desde CONFIG_REGISTROS.


# =============================================
# FUNCIONES AUXILIARES (Poblamiento Principal)
# =============================================

def _hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def _seed_areas() -> List[Dict[str, Any]]:
    return [
        {"_id": 1, "nombre": "Abarrotes"},
        {"_id": 2, "nombre": "Frutas y Verduras"},
        {"_id": 3, "nombre": "Carnes y Pescados"},
        {"_id": 4, "nombre": "Lácteos y Huevos"},
        {"_id": 5, "nombre": "Panadería y Repostería"},
        {"_id": 6, "nombre": "Bebidas"},
        {"_id": 7, "nombre": "Congelados"},
        {"_id": 8, "nombre": "Higiene Personal"},
        {"_id": 9, "nombre": "Limpieza del Hogar"},
        {"_id": 10, "nombre": "Mascotas"},
        {"_id": 11, "nombre": "Electrónica"}
    ]


def _seed_products_for_areas() -> List[Dict[str, Any]]:
    return [
        {"nombre": "Arroz", "precio": 20, "area_id": 1},
        {"nombre": "Aceite Vegetal", "precio": 35, "area_id": 1},
        {"nombre": "Manzana", "precio": 15, "area_id": 2},
        {"nombre": "Plátano", "precio": 12, "area_id": 2},
        {"nombre": "Tomate", "precio": 8, "area_id": 2},
        {"nombre": "Pollo Entero", "precio": 90, "area_id": 3},
        {"nombre": "Carne Molida de Res", "precio": 150, "area_id": 3},
        {"nombre": "Leche Entera", "precio": 25, "area_id": 4},
        {"nombre": "Pan de Molde", "precio": 30, "area_id": 5},
        {"nombre": "Jugo de Naranja", "precio": 28, "area_id": 6},
        {"nombre": "Agua Mineral", "precio": 10, "area_id": 6},
        {"nombre": "Helado de Vainilla", "precio": 70, "area_id": 7},
        {"nombre": "Shampoo", "precio": 45, "area_id": 8},
        {"nombre": "Detergente Líquido", "precio": 80, "area_id": 9},
        {"nombre": "Alimento para perro", "precio": 120, "area_id": 10},
        {"nombre": "Audífonos inalámbricos", "precio": 400, "area_id": 11}
    ]


def _random_datetime_within_last_days(days: int = 90) -> datetime:
    delta = timedelta(
        days=random.randint(0, days),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59)
    )
    return datetime.now(timezone.utc) - delta


# La función _distribute_counts_equally ya no es necesaria (#!MODIFICADO)
# def _distribute_counts_equally(total: int, buckets: List[str]) -> Dict[str, int]:
#     ...


def _batch_insert(collection, docs: List[Dict], batch_size: int = BATCH_SIZE) -> Tuple[int, int]:
    inserted = 0
    failed = 0
    if not docs:
        return 0, 0
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        try:
            res = collection.insert_many(batch, ordered=False)
            inserted += len(res.inserted_ids)
        except Exception as e:
            logger.warning("Batch insert falló en %s: %s", getattr(collection, "name", "<unknown>"), e)
            failed += len(batch)
    return inserted, failed


# =============================================
# FUNCIONES AUXILIRES DE MULTIMEDIA (#!NUEVO)
# =============================================

def _guardar_en_mongo_gridfs(fs: gridfs.GridFS, data_bytes, filename, tipo, content_type):
    """Guarda un archivo binario directamente en MongoDB (GridFS)."""
    fs.put(data_bytes, filename=filename, tipo=tipo, contentType=content_type)


def _generar_imagen_color(fs: gridfs.GridFS, i: int):
    """Genera una imagen de color sólido y la guarda en MongoDB."""
    color = tuple(np.random.randint(0, 256, 3))
    img = Image.new("RGB", (IMG_ANCHO, IMG_ALTO), color)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    _guardar_en_mongo_gridfs(fs, buffer.getvalue(), f"imagen_{i:05}.png", "imagen", "image/png")


def _generar_imagen_ruido(fs: gridfs.GridFS, i: int):
    """Genera una imagen de ruido aleatorio y la guarda en MongoDB."""
    ruido = np.random.randint(0, 256, (IMG_ALTO, IMG_ANCHO, 3), dtype=np.uint8)
    img = Image.fromarray(ruido)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    _guardar_en_mongo_gridfs(fs, buffer.getvalue(), f"foto_{i:05}.png", "foto", "image/png")


def _generar_video(fs: gridfs.GridFS, i: int):
    """Genera un video corto con colores aleatorios y lo guarda en MongoDB."""
    nombre = f"video_{i:05}.mp4"
    ruta_temporal = os.path.join(os.getcwd(), nombre)  # Ruta temporal

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video = cv2.VideoWriter(ruta_temporal, fourcc, VID_FPS, (IMG_ANCHO, IMG_ALTO))

    for _ in range(VID_FPS * VID_DURACION):
        frame = np.random.randint(0, 256, (IMG_ALTO, IMG_ANCHO, 3), dtype=np.uint8)
        video.write(frame)
    video.release()

    try:
        with open(ruta_temporal, "rb") as f:
            _guardar_en_mongo_gridfs(fs, f.read(), nombre, "video", "video/mp4")
    finally:
        # Asegurarse de borrar el archivo temporal
        if os.path.exists(ruta_temporal):
            os.remove(ruta_temporal)


# =============================================
# FUNCIONES DE CONTROL
# =============================================

def _colecciones_necesarias() -> List[str]:
    # 'multimedia.files' y 'multimedia.chunks' son manejadas por GridFS
    return ["usuarios", "areas", "productos", "clientes", "ventas", "logs"]


def asegurar_base(get_db_callable: Callable[[], Any]) -> Dict[str, str]:
    """
    Asegura que las colecciones necesarias existan y crea índices esenciales.
    """
    db = get_db_callable()
    if db is None:
        raise RuntimeError("get_db_callable retornó None")

    colecciones = _colecciones_necesarias()
    existentes = set(db.list_collection_names())
    created: List[str] = []

    for col in colecciones:
        if col not in existentes:
            try:
                db.create_collection(col)
                created.append(col)
                logger.info("Colección creada: %s", col)
            except Exception as e:
                logger.debug("create_collection(%s) fallo: %s", col, e)

    # Índices recomendados (tolerantes si ya existen)
    usuarios_idx = IndexModel([("usuario_key", ASCENDING)], unique=True, name="idx_usuario_key")
    productos_idx = IndexModel([("sku", ASCENDING)], unique=False, name="idx_sku")
    clientes_idx = IndexModel([("nombre", ASCENDING)], unique=False, name="idx_cliente_nombre")
    ventas_idx = IndexModel([("created_at", ASCENDING)], unique=False, name="idx_ventas_created_at")
    logs_idx = IndexModel([("created_at", ASCENDING)], unique=False, name="idx_logs_created_at")
    areas_idx = IndexModel([("_id", ASCENDING)], unique=True, name="idx_areas_id")
    
    # (#!NUEVO) Índices para GridFS (MongoDB los maneja, pero aseguramos la colección)
    try:
        if "multimedia.files" not in existentes:
             db.create_collection("multimedia.files")
             db.create_collection("multimedia.chunks")
             logger.info("Colecciones GridFS 'multimedia' creadas.")
             # MongoDB crea automáticamente los índices correctos en 'multimedia.files' y 'multimedia.chunks'
             # al instanciar gridfs.GridFS, pero esto asegura que existan.
    except Exception as e:
       logger.debug("GridFS collections: %s", e)


    try:
        db["usuarios"].create_indexes([usuarios_idx])
    except Exception as e:
        logger.debug("Índice usuarios: %s", e)
    try:
        db["productos"].create_indexes([productos_idx])
    except Exception as e:
        logger.debug("Índice productos: %s", e)
    try:
        db["clientes"].create_indexes([clientes_idx])
    except Exception as e:
        logger.debug("Índice clientes: %s", e)
    try:
        db["ventas"].create_indexes([ventas_idx])
    except Exception as e:
        logger.debug("Índice ventas: %s", e)
    try:
        db["logs"].create_indexes([logs_idx])
    except Exception as e:
        logger.debug("Índice logs: %s", e)
    try:
        db["areas"].create_indexes([areas_idx])
    except Exception as e:
        logger.debug("Índice areas: %s", e)

    mensaje = f"Colecciones aseguradas. Nuevas: {', '.join(created) if created else 'ninguna'}"
    logger.info(mensaje)
    return {"mensaje": mensaje}


def _base_ya_poblada(db) -> Tuple[bool, int]:
    """
    Comprueba si la base ya contiene datos en las colecciones objetivo.
    """
    colecciones = _colecciones_necesarias()
    existentes = set(db.list_collection_names())
    for col in colecciones:
        if col not in existentes:
            return False, 0
    total_docs = 0
    for col in colecciones:
        try:
            cnt = int(db[col].estimated_document_count())
        except Exception:
            try:
                cnt = int(db[col].count_documents({}))
            except Exception:
                cnt = 0
        total_docs += cnt
        
    # (#!NUEVO) Chequear también GridFS
    try:
        if "multimedia.files" in existentes:
            total_docs += int(db["multimedia.files"].count_documents({}))
    except Exception:
        pass # No es crítico si falla
        
    return (total_docs > 0), total_docs


# (#!NUEVO) Función dedicada para poblar multimedia (#!MODIFICADO)
def poblar_multimedia(db: Any, num_imagenes: int, num_fotos: int, num_videos: int) -> Dict[str, Any]:
    """
    Puebla la colección 'multimedia' (GridFS) con imágenes y videos.
    Ahora recibe los conteos como parámetros.
    """
    logger.info("Iniciando poblamiento de multimedia (GridFS)...")
    fs = gridfs.GridFS(db, collection="multimedia")
    
    # Chequear si ya hay multimedia para no duplicar
    try:
        if fs.exists():
             count = db["multimedia.files"].count_documents({})
             if count > 0:
                 logger.warning("Colección 'multimedia' (GridFS) ya contiene %s archivos. Se omite poblamiento.", count)
                 return {"imagenes": 0, "fotos": 0, "videos": 0, "status": "omitido"}
    except Exception as e:
        logger.error("Error al chequear GridFS: %s", e)
        # Continuar de todos modos, pero loguear el error

    # 1. Imágenes de color
    logger.info("🎨 Generando y guardando imágenes de color...")
    for i in range(1, num_imagenes + 1): # (#!MODIFICADO)
        try:
            _generar_imagen_color(fs, i)
            if i % 1000 == 0 or i == num_imagenes:
                logger.info("✅ %s/%s imágenes guardadas", i, num_imagenes) # (#!MODIFICADO)
        except Exception as e:
            logger.warning("Fallo al generar imagen color %s: %s", i, e)

    # 2. Fotos de ruido
    logger.info("📸 Generando y guardando fotos (ruido)...")
    for i in range(1, num_fotos + 1): # (#!MODIFICADO)
        try:
            _generar_imagen_ruido(fs, i)
            if i % 1000 == 0 or i == num_fotos:
                logger.info("✅ %s/%s fotos guardadas", i, num_fotos) # (#!MODIFICADO)
        except Exception as e:
            logger.warning("Fallo al generar foto ruido %s: %s", i, e)

    # 3. Videos
    logger.info("🎥 Generando y guardando videos...")
    for i in range(1, num_videos + 1): # (#!MODIFICADO)
        try:
            _generar_video(fs, i)
            if i % 100 == 0 or i == num_videos:
                logger.info("🎬 %s/%s videos guardados", i, num_videos) # (#!MODIFICADO)
        except Exception as e:
            logger.warning("Fallo al generar video %s: %s", i, e)
    
    logger.info("🎉 ¡Poblamiento de multimedia completo!")
    return {
        "imagenes_creadas": num_imagenes, # (#!MODIFICADO)
        "fotos_creadas": num_fotos, # (#!MODIFICADO)
        "videos_creados": num_videos, # (#!MODIFICADO)
        "status": "completado"
    }

# =============================================
# FUNCIÓN PRINCIPAL DE POBLAMIENTO
# =============================================

# (#!MODIFICADO) Se elimina el parámetro 'total_records'
def crear_y_poblar_db(get_db_callable: Callable[[], Any]) -> Dict[str, Any]:
    """
    Crea/asegura colecciones e índices y luego puebla la base usando
    la configuración global 'CONFIG_REGISTROS'.
    Finalmente, puebla GridFS con archivos multimedia.
    """
    db = get_db_callable()
    if db is None:
        raise RuntimeError("get_db_callable retornó None")

    # 1) Asegurar estructura
    resultado_asegurar = asegurar_base(get_db_callable)

    # 2) Comprobar si ya hay datos para evitar duplicados
    already, total_docs = _base_ya_poblada(db)
    if already:
        mensaje = f"Base ya existente con {total_docs} documentos; se omite poblamiento."
        logger.info(mensaje)
        return {"mensaje": resultado_asegurar.get("mensaje", ""), "resumen": {"inserted_total": 0, "reason": mensaje}}

    # 3) Obtener la configuración de registros (#!MODIFICADO)
    colecciones = _colecciones_necesarias()
    
    # Usamos la configuración global 'CONFIG_REGISTROS' directamente
    # Se usan valores .get() para evitar errores si falta una clave
    counts = {
        "usuarios": CONFIG_REGISTROS.get("usuarios", 50),
        "areas": CONFIG_REGISTROS.get("areas", 11),
        "productos": CONFIG_REGISTROS.get("productos", 100),
        "clientes": CONFIG_REGISTROS.get("clientes", 1000),
        "ventas": CONFIG_REGISTROS.get("ventas", 1000),
        "logs": CONFIG_REGISTROS.get("logs", 1000),
    }

    # (#!MODIFICADO) Se elimina la lógica de distribución y rebalanceo.
    # Ahora solo validamos los mínimos requeridos por los 'seeds'.

    min_areas = len(_seed_areas())
    min_products = len(_seed_products_for_areas())

    if counts["areas"] < min_areas:
        logger.warning(
            "Configuración 'areas' (%s) es menor al mínimo requerido (%s). Se usará el mínimo.", 
            counts["areas"], min_areas
        )
        counts["areas"] = min_areas

    if counts["productos"] < min_products:
        logger.warning(
            "Configuración 'productos' (%s) es menor al mínimo requerido (%s). Se usará el mínimo.", 
            counts["productos"], min_products
        )
        counts["productos"] = min_products
    
    # (#!MODIFICADO) La lógica de 'deficit' y 'donors' se elimina.

    logger.info("Distribución para poblamiento: %s", counts)

    # 4) Ejecutar poblamiento por colecciones (semillas + synthetic), insertando por lotes
    summary = {k: 0 for k in colecciones}
    failed_summary = {k: 0 for k in colecciones}

    # Areas (upsert por _id)
    try:
        areas_col = db["areas"]
        areas_docs = _seed_areas()
        # Solo inserta las áreas necesarias hasta el conteo,
        # pero asegura que las 11 base estén si el conteo es >= 11
        docs_a_insertar = areas_docs[:counts["areas"]]
        
        if not docs_a_insertar and counts["areas"] > 0:
            # Si el usuario pide más áreas que las 11 de seed, creamos sintéticas
            for i in range(len(areas_docs), counts["areas"]):
                docs_a_insertar.append({"_id": i + 1, "nombre": f"Area Sintetica {i+1}"})
        
        for a in docs_a_insertar:
            areas_col.replace_one({"_id": a["_id"]}, a, upsert=True)
        summary["areas"] = len(docs_a_insertar)
        
    except Exception as e:
        logger.exception("Fallo al insertar areas: %s", e)
        failed_summary["areas"] = counts["areas"]

    # Productos base (seed) + synthetic
    try:
        productos_col = db["productos"]
        base_products = _seed_products_for_areas()
        
        # Aseguramos que los productos base se inserten si el conteo lo permite
        productos_a_insertar_seed = base_products[:counts["productos"]]
        
        for p in productos_a_insertar_seed:
            doc = {
                **p,
                "created_at": datetime.now(timezone.utc),
                "activo": True,
                "stock": random.randint(1, 500),
                "sku": p.get("sku", f"SKU-{random.randint(1000,9999)}")
            }
            # (Corregido) El _id de area es un INT en tu seed, así que p["area_id"] es correcto
            productos_col.replace_one({"nombre": p["nombre"], "area_id": p["area_id"]}, doc, upsert=True)
        summary["productos"] += len(productos_a_insertar_seed)
    except Exception as e:
        logger.exception("Fallo al insertar productos seed: %s", e)
        failed_summary["productos"] += len(productos_a_insertar_seed)

    extra_products = max(0, counts["productos"] - summary["productos"])
    if extra_products > 0:
        synthetic_products: List[Dict] = []
        try:
            # (Corregido) Los _id de area son INTs
            areas_snapshot = list(db["areas"].find({}, {"_id": 1}))
            if not areas_snapshot:
                areas_snapshot = [{"_id": a["_id"]} for a in _seed_areas()[:counts["areas"]]]
        except Exception:
            areas_snapshot = [{"_id": a["_id"]} for a in _seed_areas()[:counts["areas"]]]

        if not areas_snapshot: # Fallback si no hay áreas
            logger.warning("No se encontraron áreas para asignar a productos sintéticos.")
            areas_snapshot = [{"_id": 1}]

        for _ in range(extra_products):
            prod = {
                "nombre": f"Producto Synthetic {random.randint(1_000_000, 9_999_999)}",
                "precio": round(random.uniform(5, 500), 2),
                "area_id": random.choice(areas_snapshot)["_id"], # Asigna un area_id (INT)
                "sku": f"SYN-{random.randint(100000,999999)}",
                "stock": random.randint(0, 500),
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            }
            synthetic_products.append(prod)
        ins, fail = _batch_insert(productos_col, synthetic_products)
        summary["productos"] += ins
        failed_summary["productos"] += fail

    # Usuarios (seed + synthetic)
    try:
        usuarios_col = db["usuarios"]
        pwd_hashed = _hash_password(DEFAULT_PASSWORD)
        seed_users = [
            {"usuario": "admin", "usuario_key": "admin", "rol": "administrador", "password_hash": pwd_hashed, "activo": True, "created_at": datetime.now(timezone.utc)},
            {"usuario": "trabajador1", "usuario_key": "trabajador1", "rol": "trabajador", "password_hash": pwd_hashed, "activo": True, "created_at": datetime.now(timezone.utc)},
            {"usuario": "cliente1", "usuario_key": "cliente1", "rol": "cliente", "password_hash": pwd_hashed, "activo": True, "created_at": datetime.now(timezone.utc)}
        ]
        
        # Insertar seeds si el conteo lo permite
        users_a_insertar_seed = seed_users[:counts["usuarios"]]
        
        for u in users_a_insertar_seed:
            usuarios_col.replace_one({"usuario_key": u["usuario_key"]}, u, upsert=True)
        summary["usuarios"] = len(users_a_insertar_seed)
    except Exception as e:
        logger.exception("Fallo al insertar usuarios seed: %s", e)
        failed_summary["usuarios"] += len(users_a_insertar_seed)

    extra_users = max(0, counts["usuarios"] - summary["usuarios"])
    if extra_users > 0:
        synthetic_users: List[Dict] = []
        for _ in range(extra_users):
            key = f"user{random.randint(1000000,9999999)}"
            synthetic_users.append({
                "usuario": f"User {key}",
                "usuario_key": key,
                "password_hash": pwd_hashed,
                "rol": random.choice(ROLES),
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            })
        ins, fail = _batch_insert(usuarios_col, synthetic_users)
        summary["usuarios"] += ins
        failed_summary["usuarios"] += fail

    # --- (#!NUEVO) Creación de Lookups para Clientes y Ventas ---
    try:
        # 1. Snapshot de Productos (con todos los datos necesarios)
        products_snapshot = list(db["productos"].find(
            {"activo": True}, # Solo vender productos activos
            {"_id": 1, "nombre": 1, "precio": 1, "area_id": 1} # Pedimos los 4 campos
        ))
        if not products_snapshot:
            logger.warning("No se encontraron productos en la BD, usando seeds como fallback...")
            # Fallback simple si 'productos' falló
            products_snapshot = [
                {**p, "_id": i} for i, p in enumerate(_seed_products_for_areas())
            ]
        
        # 2. Lookup de Áreas (para nombre)
        areas_snapshot = list(db["areas"].find({}, {"_id": 1, "nombre": 1}))
        # El _id de area es un INT en tu seed, así que el lookup funciona
        area_lookup = {a["_id"]: a["nombre"] for a in areas_snapshot} 
        
    except Exception as e:
        logger.exception("Fallo al crear snapshots de productos/áreas: %s", e)
        # Si falla, crear fallbacks para no detener todo
        products_snapshot = [{"_id": 999, "nombre": "Fallback Prod", "precio": 10, "area_id": 1}]
        area_lookup = {1: "Abarrotes"}
    # --- Fin de Lookups ---


    # Clientes (#!MODIFICADO para usar la estructura correcta)
    try:
        clientes_col = db["clientes"]
        clientes_needed = counts["clientes"]
        clientes_docs: List[Dict] = []
        
        for _ in range(clientes_needed):
            num_productos = random.randint(1, 5)
            seleccion = random.choices(products_snapshot, k=num_productos)
            productos_finales = []
            total_price = 0.0
            
            for prod in seleccion:
                precio = float(prod.get("precio", 0))
                cantidad = random.randint(1, 5)
                subtotal = precio * cantidad
                total_price += subtotal
                
                # --- NUEVA ESTRUCTURA ---
                area_id = prod.get("area_id")
                area_nombre = area_lookup.get(area_id, "Area Desconocida")
                
                productos_finales.append({
                    "producto_id": prod.get("_id"), # ObjectId o Int
                    "nombre": prod.get("nombre"),
                    "precio": precio,
                    "cantidad": cantidad,
                    "subtotal": subtotal,
                    "area_id": str(area_id), # Guardar como string
                    "area_nombre": area_nombre
                })
                # --- FIN NUEVA ESTRUCTURA ---

            fecha_creacion = _random_datetime_within_last_days(90)
            cliente_doc = {
                "nombre": f"Cliente {random.randint(1_000_000, 9_999_999)}",
                "contacto": {"telefono": f"55{random.randint(10000000,99999999)}"},
                "productos": productos_finales, # <-- ¡Ahora con estructura completa!
                "total": round(total_price, 2),
                "fecha": fecha_creacion.isoformat(),
                "created_at": fecha_creacion
            }
            clientes_docs.append(cliente_doc)

        if clientes_docs:
            ins, fail = _batch_insert(clientes_col, clientes_docs)
            summary["clientes"] += ins
            failed_summary["clientes"] += fail
    except Exception as e:
        logger.exception("Fallo al poblar clientes: %s", e)
        failed_summary["clientes"] += counts.get("clientes", 0)

    # Ventas (#!MODIFICADO para usar la estructura correcta)
    try:
        ventas_col = db["ventas"]
        ventas_needed = counts["ventas"]
        ventas_docs: List[Dict] = []
        
        try:
            sample_client_ids = [d["_id"] for d in db["clientes"].find({}, {"_id": 1}).limit(1000)]
        except Exception:
            sample_client_ids = []

        # (Usamos products_snapshot y area_lookup de la sección anterior)

        for i in range(ventas_needed):
            seleccion = random.choices(products_snapshot, k=random.randint(1, 5))
            productos_finales = []
            total_price = 0.0
            
            for prod in seleccion:
                precio = float(prod.get("precio", 0))
                cantidad = random.randint(1, 5)
                subtotal = precio * cantidad
                total_price += subtotal
                
                # --- NUEVA ESTRUCTURA (igual que en Clientes) ---
                area_id = prod.get("area_id")
                area_nombre = area_lookup.get(area_id, "Area Desconocida")
                
                productos_finales.append({
                    "producto_id": prod.get("_id"),
                    "nombre": prod.get("nombre"),
                    "precio": precio,
                    "cantidad": cantidad,
                    "subtotal": subtotal,
                    "area_id": str(area_id),
                    "area_nombre": area_nombre
                })
                # --- FIN NUEVA ESTRUCTURA ---
            
            # (#!NUEVO) Fechas consistentes
            fecha_venta = _random_datetime_within_last_days(200_000)

            venta = {
                "cliente_ref": random.choice(sample_client_ids) if sample_client_ids else None,
                "productos": productos_finales, # <-- ¡Ahora con estructura completa!
                "total": round(total_price, 2),
                "vendedor_key": random.choice(["admin", "trabajador1"]),
                "metodo_pago": random.choice(["efectivo", "tarjeta", "transferencia"]),
                "fecha": fecha_venta.isoformat(), # <-- Fecha aleatoria
                "created_at": fecha_venta,        # <-- Misma fecha aleatoria (como objeto Date)
                "estado": random.choice(["completada", "anulada"])
            }
            ventas_docs.append(venta)

        if ventas_docs:
            ins, fail = _batch_insert(ventas_col, ventas_docs)
            summary["ventas"] += ins
            failed_summary["ventas"] += fail
    except Exception as e:
        logger.exception("Fallo al poblar ventas: %s", e)
        failed_summary["ventas"] += counts.get("ventas", 0)

    # Logs
    try:
        logs_col = db["logs"]
        logs_needed = counts["logs"]
        logs_docs: List[Dict] = []
        for _ in range(logs_needed):
            logs_docs.append({
                "nivel": random.choice(["INFO", "WARNING", "ERROR"]),
                "servicio": random.choice(["init", "seed", "venta", "auth", "productos"]),
                "mensaje": f"Log synthetic {random.randint(1000000,9999999)}",
                "meta": {},
                "created_at": _random_datetime_within_last_days(180)
            })
        if logs_docs:
            ins, fail = _batch_insert(logs_col, logs_docs)
            summary["logs"] += ins
            failed_summary["logs"] += fail
    except Exception as e:
        logger.exception("Fallo al poblar logs: %s", e)
        failed_summary["logs"] += counts.get("logs", 0)


    # 5) (#!NUEVO) Poblar Multimedia (GridFS)
    # Esto se ejecuta DESPUÉS de poblar las colecciones principales
    try:
        # (#!MODIFICADO) Pasamos los contadores desde la configuración
        resumen_multimedia = poblar_multimedia(
            db,
            num_imagenes=CONFIG_REGISTROS.get("imagenes_color", 0),
            num_fotos=CONFIG_REGISTROS.get("fotos_ruido", 0),
            num_videos=CONFIG_REGISTROS.get("videos", 0)
        )
        logger.info("Resumen de multimedia: %s", resumen_multimedia)
    except Exception as e:
        logger.exception("Fallo catastrófico al poblar multimedia: %s", e)
        resumen_multimedia = {"status": "fallido", "error": str(e)}


    # 6) Resultado final
    inserted_total = sum(summary.values())
    failed_total = sum(failed_summary.values())

    result = {
        **summary,
        "inserted_total": inserted_total,
        "failed_total": failed_total,
        "failed_details": failed_summary,
        "multimedia_summary": resumen_multimedia  # (#!NUEVO)
    }
    logger.info("Poblamiento completo. Resumen: %s", result)
    return result

# ---------------------------------------------
# EJEMPLO DE CÓMO LLAMARLO
# ---------------------------------------------
# (No incluido en el script final, solo como ejemplo)
#
# from pymongo import MongoClient
#
# def get_db_dev():
#     try:
#         client = MongoClient("mongodb://localhost:27017/")
#         db = client["supermercado_dev"]
#         return db
#     except Exception as e:
#         print(f"No se pudo conectar a MongoDB: {e}")
#         return None
#
# if __name__ == "__main__":
#     # Ahora solo llamas a la función sin parámetros (#!MODIFICADO)
#     resultado = crear_y_poblar_db(get_db_dev)
#     print("--- RESULTADO DEL POBLAMIENTO ---")
#     import json
#     print(json.dumps(resultado, indent=2))
#