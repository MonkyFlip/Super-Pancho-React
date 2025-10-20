# read.py
"""
Headless analysis using PySpark (compatible Spark 3.2.2).
Ahora apunta a la base de datos 'superpancho_db'.
Funciones principales:
 - run_full_analysis(mongo_uri: str = ..., spark_opts: dict = None) -> dict
 - query_result_sections(result: dict, section: str) -> dict | list
No depende de UI.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
from decimal import Decimal

from pyspark.sql import SparkSession
from pyspark.sql.functions import avg, sum as _sum, count as _count, col, desc, explode, max as _max, min as _min
from pyspark.sql.types import DateType

DEFAULT_MONGO_URI = "mongodb://localhost:27017/superpancho_db.clientes"

class ReadError(ValueError):
    pass

def _safe_iso(val: Optional[Any]) -> Optional[str]:
    if isinstance(val, datetime):
        return val.isoformat()
    return val

def _create_spark_session(app_name: str = "AnalisisSuperpancho", spark_opts: Optional[Dict[str, str]] = None) -> SparkSession:
    builder = SparkSession.builder.appName(app_name)
    if spark_opts:
        for k, v in spark_opts.items():
            builder = builder.config(k, v)
    else:
        builder = builder.config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1")
        builder = builder.config("spark.sql.adaptive.enabled", "false")
        builder = builder.config("spark.sql.shuffle.partitions", "4")
    return builder.getOrCreate()

def _load_dataframe(spark: SparkSession, mongo_uri: str) -> Any:
    try:
        df = spark.read.format("mongo").option("uri", mongo_uri).load()
        return df
    except Exception as e:
        raise ReadError(f"Error cargando datos desde MongoDB ({mongo_uri}): {e}")

def run_full_analysis(mongo_uri: str = DEFAULT_MONGO_URI, spark_opts: Optional[Dict[str, str]] = None, stop_spark: bool = True) -> Dict[str, Any]:
    """
    Ejecuta el análisis completo y devuelve:
      - metadata: started_at, finished_at, total_records, min_fecha, max_fecha
      - summary_text: texto plano
      - sections: lista estructurada (dia_mas_ventas, top_products, top_clients, stats)
    mongo_uri por defecto apunta a 'superpancho_db.clientes'.
    """
    started_at = datetime.utcnow()
    spark = None
    try:
        spark = _create_spark_session(spark_opts=spark_opts)
        df = _load_dataframe(spark, mongo_uri)

        result_meta: Dict[str, Any] = {"started_at": _safe_iso(started_at)}
        total_records = int(df.count())
        result_meta["total_records"] = total_records

        summary_lines: List[str] = []
        summary_lines.append("=== ANÁLISIS COMPLETO DE SUPERPANCHO ===")
        summary_lines.append(f"Fecha del análisis: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
        summary_lines.append(f"Total de registros: {total_records}")

        sections: List[Dict[str, Any]] = []

        # Procesar fechas
        if "fecha" in df.columns:
            df = df.withColumn("fecha_simple", col("fecha").substr(1, 10))
            df = df.withColumn("fecha_date", col("fecha_simple").cast(DateType()))
            fechas = df.agg(_min("fecha_date").alias("min_fecha"), _max("fecha_date").alias("max_fecha")).first()
            min_fecha = fechas["min_fecha"]
            max_fecha = fechas["max_fecha"]
            result_meta["min_fecha"] = _safe_iso(min_fecha)
            result_meta["max_fecha"] = _safe_iso(max_fecha)
            summary_lines.append(f"Rango de fechas: Desde {result_meta['min_fecha']} Hasta {result_meta['max_fecha']}")

        # Día con más ventas (por monto)
        if "fecha_date" in df.columns and "total" in df.columns:
            ventas_por_dia = df.groupBy("fecha_date").agg(_sum("total").alias("total_ventas"), _count("_id").alias("cantidad_ventas")).orderBy(desc("total_ventas"))
            top_dia = ventas_por_dia.limit(1).collect()
            if top_dia:
                row = top_dia[0]
                dia_info = {
                    "section": "dia_mas_ventas",
                    "fecha": _safe_iso(row["fecha_date"]),
                    "total_ventas": float(row["total_ventas"]) if row["total_ventas"] is not None else 0.0,
                    "cantidad_ventas": int(row["cantidad_ventas"])
                }
                sections.append(dia_info)
                summary_lines.append(f"1. DIA CON MAS VENTAS: {dia_info['fecha']} Total: ${dia_info['total_ventas']:.2f}")

        # Promedios
        if "fecha_date" in df.columns:
            clientes_por_dia = df.groupBy("fecha_date").agg(_count("nombre").alias("clientes_dia"))
            avg_row = clientes_por_dia.select(avg("clientes_dia").alias("promedio")).first()
            promedio_clientes = float(avg_row["promedio"]) if avg_row and avg_row["promedio"] is not None else 0.0
            summary_lines.append(f"2. PROMEDIO DE CLIENTES POR DIA: {promedio_clientes:.2f}")
        if "total" in df.columns:
            avg_total_row = df.agg(avg("total").alias("promedio_venta")).first()
            promedio_venta = float(avg_total_row["promedio_venta"]) if avg_total_row and avg_total_row["promedio_venta"] is not None else 0.0
            summary_lines.append(f"3. PROMEDIO DE VENTA POR CLIENTE: ${promedio_venta:.2f}")

        # Productos top
        if "productos" in df.columns:
            try:
                productos_exploded = df.select(explode("productos").alias("producto")).select("producto.*")
                productos_cantidad = productos_exploded.groupBy("nombre").agg(_sum("cantidad").alias("total_vendido"), _sum(col("precio") * col("cantidad")).alias("ingresos_totales")).orderBy(desc("total_vendido")).limit(10)
                top_products = []
                for r in productos_cantidad.collect():
                    top_products.append({
                        "nombre": r["nombre"],
                        "total_vendido": int(r["total_vendido"]) if r["total_vendido"] is not None else 0,
                        "ingresos_totales": float(r["ingresos_totales"]) if r["ingresos_totales"] is not None else 0.0
                    })
                sections.append({"section": "top_products", "items": top_products})
                summary_lines.append("4. PRODUCTOS MAS VENDIDOS (TOP 10)")
            except Exception as e:
                sections.append({"section": "top_products_error", "error": str(e)})
                summary_lines.append(f"4. ERROR en analisis de productos: {e}")

        # Top clientes y stats
        if "nombre" in df.columns and "total" in df.columns:
            top_clientes_df = df.groupBy("nombre").agg(_sum("total").alias("gasto_total"), _count("_id").alias("compras_realizadas")).orderBy(desc("gasto_total")).limit(10)
            top_clients = []
            for r in top_clientes_df.collect():
                top_clients.append({
                    "nombre": r["nombre"],
                    "gasto_total": float(r["gasto_total"]) if r["gasto_total"] is not None else 0.0,
                    "compras_realizadas": int(r["compras_realizadas"])
                })
            sections.append({"section": "top_clients", "items": top_clients})

            stats = {}
            stats["total_ventas"] = int(df.count())
            sum_row = df.agg(_sum("total").alias("sum_total")).first()
            stats["ingresos_totales"] = float(sum_row["sum_total"]) if sum_row and sum_row["sum_total"] is not None else 0.0
            avg_row = df.agg(avg("total").alias("avg_total")).first()
            stats["ticket_promedio"] = float(avg_row["avg_total"]) if avg_row and avg_row["avg_total"] is not None else 0.0
            max_row = df.agg(_max("total").alias("max_total")).first()
            stats["venta_maxima"] = float(max_row["max_total"]) if max_row and max_row["max_total"] is not None else 0.0
            min_row = df.agg(_min("total").alias("min_total")).first()
            stats["venta_minima"] = float(min_row["min_total"]) if min_row and min_row["min_total"] is not None else 0.0
            sections.append({"section": "stats", "items": stats})
            summary_lines.append(f"6. ESTADISTICAS: Ingresos totales ${stats['ingresos_totales']:.2f} Ticket promedio ${stats['ticket_promedio']:.2f}")

        finished_at = datetime.utcnow()
        result_meta["finished_at"] = _safe_iso(finished_at)

        if stop_spark and spark:
            try:
                spark.stop()
            except Exception:
                pass

        return {
            "metadata": result_meta,
            "summary_text": "\n".join(summary_lines),
            "sections": sections
        }

    except Exception as e:
        if spark:
            try:
                spark.stop()
            except Exception:
                pass
        raise ReadError(f"Error ejecutando análisis headless: {e}")

def query_result_sections(result: Dict[str, Any], section: str) -> Optional[Any]:
    """
    Devuelve la sección solicitada dentro de result['sections'] por su key 'section'.
    """
    if not result or "sections" not in result:
        return None
    for s in result["sections"]:
        if s.get("section") == section:
            return s.get("items") or s
    return None
