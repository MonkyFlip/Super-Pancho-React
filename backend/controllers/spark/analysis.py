import datetime
from pyspark.sql.functions import avg, sum, count, col, desc, explode, max, min
from pyspark.sql.types import DateType
# --- Import relativo actualizado ---
from .spark_config import get_spark_session

def run_spark_analysis():
    """
    Ejecuta todo el pipeline de análisis de datos con Spark.
    Importa la sesión de Spark desde spark_config.
    """
    spark_session = get_spark_session()
    if not spark_session:
        raise Exception("No se pudo establecer la sesión de Spark.")

    # 1️⃣ Cargar colecciones desde MongoDB
    try:
        print("Cargando colecciones desde MongoDB...")
        ventas_df = (
            spark_session.read.format("mongodb")
            .option("database", "superpancho_db")
            .option("collection", "ventas")
            .load()
        )

        clientes_df = (
            spark_session.read.format("mongodb")
            .option("database", "superpancho_db")
            .option("collection", "clientes")
            .load()
        )

        productos_df = (
            spark_session.read.format("mongodb")
            .option("database", "superpancho_db")
            .option("collection", "productos")
            .load()
        )

        print("Datos cargados correctamente.")
        total_ventas = ventas_df.count()
        print(f"Ventas cargadas: {total_ventas}")

        if total_ventas == 0:
            raise Exception("No se encontraron ventas en la colección.")
    except Exception as e:
        raise Exception(f"Error al cargar datos: {str(e)}")

    # 2️⃣ Convertir fechas
    ventas_df = ventas_df.withColumn("fecha_simple", col("fecha").substr(1, 10))
    ventas_df = ventas_df.withColumn("fecha_date", col("fecha_simple").cast(DateType()))

    # 4️⃣ Preparar y unir clientes
    clientes_df = clientes_df.drop("productos") 
    clientes_df = clientes_df.withColumnRenamed("_id", "cliente_ref_id")

    ventas_df = ventas_df.withColumnRenamed("total", "total_venta")

    # Unir por referencia de cliente
    ventas_df = ventas_df.join(
        clientes_df,
        ventas_df["cliente_ref"] == clientes_df["cliente_ref_id"],
        how="left"
    )

    # Diccionario de resultados
    results = {
        "fecha_analisis": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_ventas": total_ventas,
        "rango_fechas": {},
        "dia_mas_ventas": {},
        "promedios": {},
        "top_10_productos": [],
        "top_10_clientes": [],
        "estadisticas_generales": {}
    }

    # 5️⃣ Rango de fechas
    fechas = ventas_df.agg(min("fecha_date").alias("min_fecha"), max("fecha_date").alias("max_fecha")).first()
    results["rango_fechas"] = {
        "desde": str(fechas["min_fecha"]) if fechas["min_fecha"] else "N/A",
        "hasta": str(fechas["max_fecha"]) if fechas["max_fecha"] else "N/A"
    }

    # 6️⃣ Día con más ventas
    ventas_por_dia = (
        ventas_df.groupBy("fecha_date")
        .agg(sum("total_venta").alias("total_vendido"), count("_id").alias("cantidad_ventas"))
        .orderBy(desc("total_vendido"))
    )
    if ventas_por_dia.count() > 0:
        top_dia = ventas_por_dia.first()
        results["dia_mas_ventas"] = {
            "fecha": str(top_dia["fecha_date"]),
            "total_vendido": float(top_dia["total_vendido"]),
            "cantidad_ventas": int(top_dia["cantidad_ventas"])
        }

    # 7️⃣ Promedios
    results["promedios"]["venta_promedio"] = ventas_df.select(avg("total_venta")).first()[0]
    results["promedios"]["ventas_por_dia"] = ventas_por_dia.select(avg("cantidad_ventas")).first()[0]

    # 8️⃣ Top 10 productos (✅ corregido)
    try:
        # Seleccionamos únicamente la columna de productos desde ventas_df, evitando ambigüedad
        ventas_productos_df = ventas_df.select(col("productos").alias("productos_venta"))

        # Expandimos el array de productos en filas individuales
        productos_exploded = ventas_productos_df.select(explode(col("productos_venta")).alias("producto"))

        # Aseguramos que el campo nombre exista antes de agrupar
        productos_limpios = productos_exploded.select(
            col("producto.nombre").alias("nombre_producto"),
            col("producto.cantidad").alias("cantidad"),
            col("producto.precio").alias("precio")
        )

        # Agrupamos los productos
        top_productos = (
            productos_limpios.groupBy("nombre_producto")
            .agg(
                sum("cantidad").alias("total_vendido"),
                sum(col("precio") * col("cantidad")).alias("ingresos_totales")
            )
            .orderBy(desc("total_vendido"))
            .limit(10)
        )

        # Convertimos los resultados a formato JSON
        results["top_10_productos"] = [
            {
                "nombre": row["nombre_producto"],
                "total_vendido": int(row["total_vendido"]),
                "ingresos_totales": float(row["ingresos_totales"])
            }
            for row in top_productos.collect()
        ]

    except Exception as e:
        results["top_10_productos"] = {"error": str(e)}


    # 9️⃣ Top 10 clientes
    top_clientes = (
        ventas_df.groupBy("nombre")
        .agg(sum("total_venta").alias("gasto_total"), count("_id").alias("compras"))
        .orderBy(desc("gasto_total"))
        .limit(10)
    )
    for row in top_clientes.collect():
        results["top_10_clientes"].append({
            "nombre": row["nombre"],
            "gasto_total": float(row["gasto_total"]),
            "compras": int(row["compras"])
        })

    # 🔟 Estadísticas generales
    stats = ventas_df.agg(
        count("_id").alias("total_ventas"),
        sum("total_venta").alias("ingresos_totales"),
        avg("total_venta").alias("ticket_promedio"),
        max("total_venta").alias("venta_maxima"),
        min("total_venta").alias("venta_minima")
    ).first()
    results["estadisticas_generales"] = {
        "total_ventas": int(stats["total_ventas"]),
        "ingresos_totales": float(stats["ingresos_totales"]),
        "ticket_promedio": float(stats["ticket_promedio"]),
        "venta_maxima": float(stats["venta_maxima"]),
        "venta_minima": float(stats["venta_minima"])
    }

    print("✅ Análisis completado correctamente.")
    return results
