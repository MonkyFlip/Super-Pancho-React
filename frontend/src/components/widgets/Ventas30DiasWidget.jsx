import React, { useEffect, useState, useCallback } from 'react';
import { resumen30dias } from '../../services/api';
import { useTranslation } from 'react-i18next';

const useVentas30Dias = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVentas = useCallback(async () => {
    try {
      const res = await resumen30dias({
        limit: 5000,
        page: 1
      });

      let registros = [];
      if (Array.isArray(res)) {
        registros = res;
      } else if (res && Array.isArray(res.data)) {
        registros = res.data;
      }

      const ordenados = registros.sort(
        (a, b) => new Date(a.fecha) - new Date(b.fecha)
      );

      setVentas(ordenados);
    } catch (err) {
      console.error("Error obteniendo ventas:", err);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  return { ventas, loading };
};

const BarChart = ({ data, height = 220 }) => {
  const { t } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        {t('widgets.sales30Days.noData')}
      </div>
    );
  }

  const valores = data.map(d => Number(d.total) || 0);
  const maxVal = Math.max(...valores);
  const minVal = Math.min(...valores);
  const avgVal = valores.reduce((a, b) => a + b, 0) / valores.length;
  const lastVal = valores[valores.length - 1];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "16px",
        height: height,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: "#666", marginBottom: 4 }}>
          {t('widgets.sales30Days.title')}
        </h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontSize: 24, fontWeight: "bold", color: "#333" }}>
            ${lastVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 12, color: "#999" }}>
            {t('widgets.sales30Days.average')}: ${avgVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'flex-end',
        gap: '2px',
        paddingTop: '10px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {valores.map((val, idx) => {
          const percentage = (val / maxVal) * 100;
          const isHovered = hoveredIndex === idx;
          const isLast = idx === valores.length - 1;
          
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${Math.max(percentage, 2)}%`,
                background: isLast 
                  ? '#3b82f6'
                  : isHovered 
                    ? '#60a5fa' 
                    : '#93c5fd',
                borderRadius: '2px 2px 0 0',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative',
                minWidth: '4px'
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#1f2937',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  marginBottom: '4px',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontWeight: 'bold' }}>
                    ${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    {new Date(data[idx].fecha).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '4px solid #1f2937'
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ 
        height: '1px', 
        background: '#e5e7eb', 
        marginTop: '0' 
      }} />
    </div>
  );
};

const Ventas30DiasWidget = () => {
  const { t } = useTranslation();
  const { ventas, loading } = useVentas30Dias();

  if (loading) {
    return (
      <div style={{
        background: "#fff",
        borderRadius: 12,
        padding: "16px",
        height: 240,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#999"
      }}>
        {t('common.loading')}
      </div>
    );
  }

  return <BarChart data={ventas} height={240} />;
};

export default Ventas30DiasWidget;