// Estadisticas.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { temas } from '../../../styles/temas';
import KPICard from '../../../components/admin/KPICard';
import { getEstadisticasResumen } from '../../../services/api';

const THEME_KEY = 'app_theme_selected';

/**
 * Estadisticas
 * Vista con KPIs principales y series simples. Para gráficos puedes integrar Chart.js, Recharts o similar.
 * Aquí entrego placeholders y estructura para conectar datos (resumen + series).
 */
const Estadisticas = () => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState({ ventasHoy: 0, ventasMes: 0, clientesNuevos: 0, ticketPromedio: 0 });
  const [series, setSeries] = useState([]); // { label, data: [{x,y}] }

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getEstadisticasResumen();
      const body = res?.data ?? {};
      setResumen({
        ventasHoy: body.ventasHoy ?? 0,
        ventasMes: body.ventasMes ?? 0,
        clientesNuevos: body.clientesNuevos ?? 0,
        ticketPromedio: body.ticketPromedio ?? 0
      });
      setSeries(body.series ?? []);
    } catch (err) {
      console.error('getEstadisticasResumen error', err);
      setResumen({ ventasHoy: 0, ventasMes: 0, clientesNuevos: 0, ticketPromedio: 0 });
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPICard title="Ventas hoy" value={`$ ${Number(resumen.ventasHoy).toFixed(2)}`} icon={<svg width="18" height="18"><path d="M2 16h20" stroke={tema.texto} /></svg>} />
        <KPICard title="Ventas mes" value={`$ ${Number(resumen.ventasMes).toFixed(2)}`} icon={<svg width="18" height="18"><rect width="18" height="18" fill={tema.texto} /></svg>} />
        <KPICard title="Clientes nuevos" value={resumen.clientesNuevos} icon={<svg width="18" height="18"><circle cx="9" cy="9" r="9" fill={tema.texto} /></svg>} />
        <KPICard title="Ticket promedio" value={`$ ${Number(resumen.ticketPromedio).toFixed(2)}`} icon={<svg width="18" height="18"><path d="M2 6h20" stroke={tema.texto} /></svg>} />
      </div>

      <div style={{ borderRadius: 10, padding: 12, border: `1px solid ${tema.borde}`, background: tema.secundario }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: tema.texto, marginBottom: 8 }}>Series temporales</div>
        <div style={{ color: tema.borde, marginBottom: 12 }}>Aquí puedes renderizar gráficos por serie. Actualmente se muestran datos crudos para integración rápida.</div>

        {loading ? (
          <div style={{ color: tema.borde }}>Cargando...</div>
        ) : (
          (series && series.length) ? series.map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: tema.texto }}>{s.label}</div>
              <div style={{ marginTop: 6, color: tema.borde }}>
                {s.data && s.data.length ? s.data.map((pt, idx) => `${pt.x}: ${pt.y}`).join(' · ') : 'Sin datos'}
              </div>
            </div>
          )) : <div style={{ color: tema.borde }}>No hay series disponibles</div>
        )}
      </div>
    </div>
  );
};

export default Estadisticas;
