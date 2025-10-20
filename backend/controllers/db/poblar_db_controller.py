from typing import Callable, List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta, timezone
import random
import logging
import bcrypt

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

DEFAULT_TOTAL_RECORDS = 500_000
MIN_TOTAL_RECORDS = 100
BATCH_SIZE = 5000

ROLES = ["administrador", "trabajador", "cliente"]
DEFAULT_PASSWORD = "1234"


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


def _distribute_counts_equally(total: int, buckets: List[str]) -> Dict[str, int]:
    keys = list(buckets)
    k = len(keys)
    base = total // k
    remainder = total % k
    result: Dict[str, int] = {}
    for i, key in enumerate(keys):
        result[key] = base + (1 if i < remainder else 0)
    return result


def _batch_insert(collection, docs: List[Dict[str, Any]]) -> Tuple[int, int]:
    inserted = 0
    failed = 0
    if not docs:
        return 0, 0
    for i in range(0, len(docs), BATCH_SIZE):
        batch = docs[i:i + BATCH_SIZE]
        try:
            res = collection.insert_many(batch, ordered=False)
            inserted += len(res.inserted_ids)
        except Exception as e:
            logger.warning("Batch insert falló en %s: %s", getattr(collection, "name", "<unknown>"), e)
            failed += len(batch)
    return inserted, failed


def poblar_por_defecto(get_db_callable: Callable[[], Any]) -> Dict[str, Any]:
    return poblar_custom_total(get_db_callable, total_records=DEFAULT_TOTAL_RECORDS, custom_distribution=None)


def poblar_custom_total(
    get_db_callable: Callable[[], Any],
    total_records: Optional[int] = None,
    custom_distribution: Optional[Dict[str, int]] = None
) -> Dict[str, Any]:
    """
    Pobla la base de datos.
    - Si custom_distribution se provee, se usa directamente (espera keys: usuarios, areas, productos, clientes, ventas, logs).
    - Si no, se reparte total_records entre las colecciones (si total_records es None usa DEFAULT_TOTAL_RECORDS).
    - Garantiza un mínimo absoluto y evita números negativos.
    """
    if total_records is None:
        total_records = DEFAULT_TOTAL_RECORDS

    try:
        total_records = int(total_records)
    except Exception:
        total_records = DEFAULT_TOTAL_RECORDS

    if total_records < MIN_TOTAL_RECORDS:
        logger.info("Ajustando total_records a mínimo %d", MIN_TOTAL_RECORDS)
        total_records = MIN_TOTAL_RECORDS

    db = get_db_callable()
    if db is None:
        raise RuntimeError("get_db_callable retornó None")

    collections = ["usuarios", "areas", "productos", "clientes", "ventas", "logs"]
    existentes = db.list_collection_names()
    if all(col in existentes for col in collections):
        logger.info("La base de datos ya existe. Se omite el poblamiento.")
        return {"mensaje": "Base ya existente. Poblamiento omitido.", **{k: 0 for k in collections}}

    # Determinar counts por colección
    if custom_distribution:
        counts = {k: max(0, int(custom_distribution.get(k, 0))) for k in collections}
        # Si suma es 0, fallback a distribución equitativa
        if sum(counts.values()) == 0:
            counts = _distribute_counts_equally(total_records, collections)
    else:
        counts = _distribute_counts_equally(total_records, collections)

    # Seguridad: evitar negativos y asegurar mínimos razonables para areas y productos seed
    for k in counts:
        if counts[k] < 0:
            logger.warning("Valor negativo detectado en %s: %d. Se ajusta a 0.", k, counts[k])
            counts[k] = 0

    # Asegurar que haya al menos los seeds para areas y productos
    minimum_areas = len(_seed_areas())
    minimum_products = len(_seed_products_for_areas())

    # Si areas o productos quedan por debajo, redistribuimos desde otras colecciones sin dejarlas negativas
    if counts["areas"] < minimum_areas:
        deficit = minimum_areas - counts["areas"]
        counts["areas"] = minimum_areas
        # quitar del resto proporcionalmente
        donors = [k for k in collections if k != "areas"]
        for d in donors:
            take = min(deficit, counts[d])
            counts[d] -= take
            deficit -= take
            if deficit <= 0:
                break
        if deficit > 0:
            # si aún hay deficit, añadirlo a productos (último recurso)
            counts["productos"] += deficit

    if counts["productos"] < minimum_products:
        deficit = minimum_products - counts["productos"]
        counts["productos"] = minimum_products
        donors = [k for k in collections if k != "productos"]
        for d in donors:
            take = min(deficit, counts[d])
            counts[d] -= take
            deficit -= take
            if deficit <= 0:
                break
        if deficit > 0:
            counts["clientes"] += deficit

    logger.info("Distribución final de documentos por colección: %s", counts)

    # Preparo summaries
    summary = {k: 0 for k in collections}
    failed_summary = {k: 0 for k in collections}

    # 1) Áreas (upsert por _id) - siempre semilla completa
    try:
        areas_col = db["areas"]
        areas_docs = _seed_areas()
        for a in areas_docs:
            areas_col.replace_one({"_id": a["_id"]}, a, upsert=True)
        summary["areas"] = len(areas_docs)
    except Exception as e:
        logger.exception("Fallo al asegurar áreas: %s", e)
        failed_summary["areas"] = len(_seed_areas())

    # 2) Productos base (seed) y synthetic si hace falta
    try:
        productos_col = db["productos"]
        base_products = _seed_products_for_areas()
        for p in base_products:
            doc = {
                **p,
                "created_at": datetime.now(timezone.utc),
                "activo": True,
                "stock": random.randint(1, 500),
                "sku": p.get("sku")  # seed no tiene sku por defecto
            }
            productos_col.replace_one({"nombre": p["nombre"], "area_id": p["area_id"]}, doc, upsert=True)
        summary["productos"] += len(base_products)
    except Exception as e:
        logger.exception("Fallo al asegurar productos base: %s", e)
        failed_summary["productos"] += len(_seed_products_for_areas())

    extra_products_needed = max(0, counts["productos"] - summary["productos"])
    if extra_products_needed > 0:
        synthetic_products: List[Dict[str, Any]] = []
        # Necesitamos areas_docs para elegir area_id safely
        try:
            areas_docs = list(db["areas"].find({}, {"_id": 1}))
            if not areas_docs:
                areas_docs = [{"_id": a["_id"]} for a in _seed_areas()]
        except Exception:
            areas_docs = [{"_id": a["_id"]} for a in _seed_areas()]

        for i in range(extra_products_needed):
            prod = {
                "nombre": f"Producto Synthetic {random.randint(1_000_000, 9_999_999)}",
                "precio": round(random.uniform(5, 500), 2),
                "area_id": random.choice(areas_docs)["_id"],
                "sku": f"SYN-{random.randint(100000,999999)}",
                "stock": random.randint(0, 500),
                "activo": True,
                "created_at": datetime.now(timezone.utc)
            }
            synthetic_products.append(prod)
        ins, fail = _batch_insert(productos_col, synthetic_products)
        summary["productos"] += ins
        failed_summary["productos"] += fail

    # 3) Usuarios (seed + synthetic)
    try:
        usuarios_col = db["usuarios"]
        pwd_hashed = _hash_password(DEFAULT_PASSWORD)
        seed_users = [
            {"usuario": "admin", "usuario_key": "admin", "rol": "administrador", "password_hash": pwd_hashed, "activo": True, "created_at": datetime.now(timezone.utc)},
            {"usuario": "trabajador1", "usuario_key": "trabajador1", "rol": "trabajador", "password_hash": pwd_hashed, "activo": True, "created_at": datetime.now(timezone.utc)},
            {"usuario": "cliente1", "usuario_key": "cliente1", "rol": "cliente", "password_hash": pwd_hashed, "activo": True, "created_at": datetime.now(timezone.utc)}
        ]
        for u in seed_users:
            usuarios_col.replace_one({"usuario_key": u["usuario_key"]}, u, upsert=True)
        summary["usuarios"] = len(seed_users)
    except Exception as e:
        logger.exception("Fallo al asegurar usuarios seed: %s", e)
        failed_summary["usuarios"] += 3

    extra_users_needed = max(0, counts["usuarios"] - summary["usuarios"])
    if extra_users_needed > 0:
        synthetic_users: List[Dict[str, Any]] = []
        for i in range(extra_users_needed):
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

    # 4) Clientes
    try:
        clientes_col = db["clientes"]
        products_snapshot = list(db["productos"].find({}, {"nombre": 1, "precio": 1}))
        if not products_snapshot:
            products_snapshot = base_products

        clientes_needed = counts["clientes"]
        clientes_docs: List[Dict[str, Any]] = []
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
                productos_finales.append({"nombre": prod.get("nombre"), "precio": precio, "cantidad": cantidad})
            fecha = _random_datetime_within_last_days(90).isoformat()
            cliente_doc = {
                "nombre": f"Cliente {random.randint(1_000_000, 9_999_999)}",
                "contacto": {"telefono": f"55{random.randint(10000000,99999999)}"},
                "productos": productos_finales,
                "total": round(total_price, 2),
                "fecha": fecha,
                "created_at": datetime.now(timezone.utc)
            }
            clientes_docs.append(cliente_doc)

        if clientes_docs:
            ins, fail = _batch_insert(clientes_col, clientes_docs)
            summary["clientes"] += ins
            failed_summary["clientes"] += fail
    except Exception as e:
        logger.exception("Fallo al poblar clientes: %s", e)
        failed_summary["clientes"] += counts.get("clientes", 0)

    # 5) Ventas
    try:
        ventas_col = db["ventas"]
        ventas_needed = counts["ventas"]
        ventas_docs: List[Dict[str, Any]] = []
        sample_client_ids = []
        try:
            sample_client_ids = [d["_id"] for d in db["clientes"].find({}, {"_id": 1}).limit(1000)]
        except Exception:
            sample_client_ids = []

        for i in range(ventas_needed):
            if i < len(clientes_docs):
                c = clientes_docs[i]
                venta = {
                    "cliente_ref": None,
                    "productos": c["productos"],
                    "total": c["total"],
                    "vendedor_key": random.choice(["admin", "trabajador1", "trabajador2"]),
                    "metodo_pago": random.choice(["efectivo", "tarjeta", "transferencia"]),
                    "fecha": c["fecha"],
                    "created_at": datetime.now(timezone.utc),
                    "estado": "completada"
                }
                ventas_docs.append(venta)
            else:
                seleccion = random.choices(products_snapshot, k=random.randint(1, 5))
                productos_finales = []
                total_price = 0.0
                for prod in seleccion:
                    precio = float(prod.get("precio", 0))
                    cantidad = random.randint(1, 5)
                    subtotal = precio * cantidad
                    total_price += subtotal
                    productos_finales.append({"nombre": prod.get("nombre"), "precio": precio, "cantidad": cantidad})
                venta = {
                    "cliente_ref": random.choice(sample_client_ids) if sample_client_ids else None,
                    "productos": productos_finales,
                    "total": round(total_price, 2),
                    "vendedor_key": random.choice(["admin", "trabajador1", "trabajador2"]),
                    "metodo_pago": random.choice(["efectivo", "tarjeta", "transferencia"]),
                    "fecha": _random_datetime_within_last_days(90).isoformat(),
                    "created_at": datetime.now(timezone.utc),
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

    # 6) Logs
    try:
        logs_col = db["logs"]
        logs_needed = counts["logs"]
        logs_docs: List[Dict[str, Any]] = []
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

    # Resultado final
    inserted_total = sum(summary.values())
    failed_total = sum(failed_summary.values())

    result = {
        **summary,
        "inserted_total": inserted_total,
        "failed_total": failed_total,
        "failed_details": failed_summary
    }
    logger.info("Poblamiento completo. Resumen: %s", result)
    return result
