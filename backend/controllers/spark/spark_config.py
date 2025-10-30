from pyspark.sql import SparkSession

# Variable global a nivel de módulo para almacenar la sesión
spark = None

def get_spark_session():
    """
    Crea o retorna la sesión de Spark existente (patrón Singleton).
    """
    global spark
    if spark is None:
        try:
            print("Iniciando sesión de Spark...")
            spark = (
                SparkSession.builder
                .appName("AnalisisSupermercadoAPI")
                .config("spark.mongodb.read.connection.uri", "mongodb://localhost:27017/")
                .config("spark.mongodb.write.connection.uri", "mongodb://localhost:27017/")
                .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:10.5.0")
                .config("spark.sql.adaptive.enabled", "false")
                .config("spark.sql.shuffle.partitions", "4")
                .config("spark.driver.memory", "2g")
                .getOrCreate()
            )
            print("✅ Sesión de Spark iniciada exitosamente.")
        except Exception as e:
            print(f"❌ Error al iniciar Spark: {str(e)}")
            spark = None
    return spark


def stop_spark():
    """
    Detiene la sesión de Spark si existe.
    """
    global spark
    if spark:
        print("Deteniendo sesión de Spark...")
        spark.stop()
        spark = None
        print("Sesión de Spark detenida.")
