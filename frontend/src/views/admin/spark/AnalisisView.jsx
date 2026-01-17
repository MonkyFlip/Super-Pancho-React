import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// --- Componentes de UI ---

/**
 * Una tarjeta reutilizable para mostrar un indicador (KPI).
 * NOTA: Agregué la prop 'className' para que funcione el estilo 'highlight-card'.
 */
const StatCard = ({ title, value, description, className = "" }) => (
  <div className={`stat-card ${className}`}>
    <h3>{title}</h3>
    <div className="value">{value}</div>
    {description && <p className="description">{description}</p>}
  </div>
);

// --- Funciones de Utilidad ---

const formatCurrency = (number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const formatNumber = (number) => {
  return new Intl.NumberFormat("es-ES").format(number);
};

// --- Componente Principal ---

const AnalisisView = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/analisis")
      .then((res) => {
        if (!res.ok) throw new Error("Error al obtener los datos");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // --- Estados de Carga (Spinner Circular) ---

  if (loading) {
    return (
      <div className="loader-container">
        {/* Estilos específicos para la carga */}
        <style>{`
          .loader-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 80vh;
            font-family: sans-serif;
            color: #555;
          }
          /* Definición del Spinner Circular */
          .spinner {
            /* Aumentamos el grosor del borde para que coincida con el nuevo tamaño */
            border: 6px solid #f3f3f3; 
            border-top: 6px solid #3498db; 
            border-radius: 50%;
            /* Aumentamos el tamaño (antes 50px) */
            width: 100px;
            height: 100px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px; /* Un poco más de espacio debajo */
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        
        <div className="spinner"></div>
        {/* Aumentamos un poco el tamaño de la fuente del texto de carga */}
        <div style={{ fontSize: '1.1rem' }}>{t("analysisView.loading")}</div>
      </div>
    );
  }

  // --- Estado de Error ---

  if (error) {
    return (
      <div className="error-container">
        {/* Estilos para error inline para asegurar que se vean */}
        <style>{`
          .error-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 80vh;
            color: #d9534f;
            font-family: sans-serif;
            font-size: 1.2rem;
          }
        `}</style>
        {t("analysisView.error")}: {error}
      </div>
    );
  }

  // --- Renderizado del Dashboard ---

  const {
    estadisticas_generales: stats,
    promedios,
    dia_mas_ventas: diaMax,
    rango_fechas: rango,
    fecha_analisis,
    top_10_clientes: clientes,
    top_10_productos: productos,
  } = data;

  return (
    <>
      {/* --- Hoja de Estilos Principal --- */}
      <style>
        {`
          .analisis-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #333;
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            margin-bottom: 24px;
            gap: 16px;
          }
          
          .header h1 {
            margin: 0;
            color: #1a202c;
          }
          
          .header .sub-header {
            text-align: right;
            color: #718096;
            font-size: 0.9rem;
          }

          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }

          .stat-card {
            background-color: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          
          .stat-card h3 {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            color: #4a5568;
            font-weight: 600;
          }
          
          .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
            color: #1a202c;
            line-height: 1.2;
          }
          
          .stat-card .description {
            font-size: 0.85rem;
            color: #718096;
            margin: 4px 0 0 0;
          }

          /* Estilos para tarjeta destacada */
          .stat-card.highlight-card {
            background-color: #f0f9ff;
            border: 1px solid #b3e0ff;
          }
          
          .stat-card.highlight-card .value {
            color: #005a9e;
          }

          .tables-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          
          .table-container {
            background-color: #fff;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            overflow-x: auto;
          }
          
          .table-container h2 {
            margin-top: 0;
            margin-bottom: 16px;
            color: #1a202c;
          }
          
          .modern-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .modern-table th,
          .modern-table td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .modern-table th {
            background-color: #f8fafc;
            font-size: 0.8rem;
            color: #4a5568;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .modern-table tbody tr:hover {
            background-color: #f7fafc;
          }
          
          .modern-table td {
            font-size: 0.9rem;
            color: #2d3748;
          }

          @media (max-width: 992px) {
            .tables-grid {
              grid-template-columns: 1fr;
            }
          }
          
          @media (max-width: 576px) {
            .header {
              flex-direction: column;
              align-items: flex-start;
            }
            .header .sub-header {
              text-align: left;
            }
            .kpi-grid {
              grid-template-columns: 1fr 1fr;
            }
            .stat-card .value {
              font-size: 1.5rem;
            }
          }
        `}
      </style>

      {/* --- Contenido del Dashboard --- */}
      <div className="analisis-container">
        <header className="header">
          <h1>{t("analysisView.title")}</h1>

          <div className="sub-header">
            {t("analysisView.dateRange", {
              from: rango.desde,
              to: rango.hasta,
            })}
            <br />
            {t("analysisView.generatedAt", {
              date: new Date(fecha_analisis).toLocaleString(),
            })}
          </div>
        </header>

        {/* --- KPIs Principales --- */}
        <div className="kpi-grid">
          <StatCard
            title={t("analysisView.kpis.incomeTotal")}
            value={formatCurrency(stats.ingresos_totales)}
          />
          <StatCard
            title={t("analysisView.kpis.salesTotal")}
            value={formatNumber(stats.total_ventas)}
          />
          <StatCard
            title={t("analysisView.kpis.ticketAverage")}
            value={formatCurrency(promedios.venta_promedio)}
          />
          <StatCard
            title={t("analysisView.kpis.salesPerDay")}
            value={formatNumber(promedios.ventas_por_dia.toFixed(0))}
          />
          <StatCard
            title={t("analysisView.kpis.maxSale")}
            value={formatCurrency(stats.venta_maxima)}
          />
          <StatCard
            title={t("analysisView.kpis.minSale")}
            value={formatCurrency(stats.venta_minima)}
          />
        </div>

        {/* --- Tarjeta Destacada: Día con Más Ventas --- */}
        <div className="kpi-grid">
          <StatCard
            title={t("analysisView.bestDay.title")}
            value={formatCurrency(diaMax.total_vendido)}
            description={t("analysisView.bestDay.description", {
              date: diaMax.fecha,
              count: formatNumber(diaMax.cantidad_ventas),
            })}
            className="highlight-card"
          />
        </div>

        {/* --- Tablas --- */}
        <div className="tables-grid">
          <div className="table-container">
            <h2>{t("analysisView.tables.topCustomers")}</h2>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>{t("analysisView.tables.name")}</th>
                  <th>{t("analysisView.tables.purchases")}</th>
                  <th>{t("analysisView.tables.totalSpent")}</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente, index) => (
                  <tr key={index}>
                    <td>{cliente.nombre}</td>
                    <td>{formatNumber(cliente.compras)}</td>
                    <td>{formatCurrency(cliente.gasto_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-container">
            <h2>{t("analysisView.tables.topProducts")}</h2>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>{t("analysisView.tables.name")}</th>
                  <th>{t("analysisView.tables.unitsSold")}</th>
                  <th>{t("analysisView.tables.totalIncome")}</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto, index) => (
                  <tr key={index}>
                    <td>{producto.nombre}</td>
                    <td>{formatNumber(producto.total_vendido)}</td>
                    <td>{formatCurrency(producto.ingresos_totales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalisisView;