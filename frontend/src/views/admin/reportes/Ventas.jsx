// Inventario.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { getInventarioResumen, exportInventario } from '../../../services/api';
import { temas } from '../../../styles/temas';
import KPICard from '../../../components/admin/KPICard';
import FiltersPanel from '../../../components/admin/FiltersPanel';

const THEME_KEY = 'app_theme_selected';

const Inventario = () => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState({ totalProductos: 0, totalSkus: 0, valorStock: 0, criticos: [] });
  const [error, setError] = useState('');

  const fetch = useCallback(async (opts = {}) => {
    try {
      setLoading(true);
      setError('');
      const res = await getInventarioResumen({ ...filters, ...opts });
      const body = res?.data ?? {};
      setResumen({
        totalProductos: body.totalProductos ?? 0,
        totalSkus: body.totalSkus ?? 0,
        valorStock: body.valorStock ?? 0,
        criticos: body.criticos ?? []
      });
    } catch (err) {
      console.error('getInventarioResumen error', err);
      setError('Error al obtener inventario');
      setResumen({ totalProductos: 0, totalSkus: 0, valorStock: 0, criticos: [] });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleApplyFilters = (f) => { setFilters(f); };
  const handleExport = async () => {
    try {
      setLoading(true);
      await exportInventario(filters);
      alert('Export iniciado (revisa el servidor)'); // reemplazar por notificación/toast
    } catch (err) {
      console.error('exportInventario error', err);
      setError('No se pudo exportar inventario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 18, display: 'flex', gap: 18 }}>
      <div style={{ width: 360 }}>
        <FiltersPanel initial={filters} onApply={handleApplyFilters} onReset={() => setFilters({})} />
        <div style={{ marginTop: 12 }}>
          <button onClick={handleExport} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: tema.primario, color: '#fff' }}>Exportar inventario</button>
        </div>
        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <KPICard title="Productos" value={resumen.totalProductos} icon={<svg width="18" height="18"><rect width="18" height="18" fill={tema.texto} /></svg>} />
          <KPICard title="SKUs" value={resumen.totalSkus} icon={<svg width="18" height="18"><circle cx="9" cy="9" r="9" fill={tema.texto} /></svg>} />
          <KPICard title="Valor stock" value={`$ ${Number(resumen.valorStock || 0).toFixed(2)}`} icon={<svg width="18" height="18"><path d="M2 16h20" stroke={tema.texto} /></svg>} />
        </div>

        <div style={{ borderRadius: 10, padding: 12, border: `1px solid ${tema.borde}`, background: tema.secundario }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: tema.texto }}>Productos críticos</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ color: tema.borde }}>Cargando...</div>
            ) : (
              (resumen.criticos || []).length ? resumen.criticos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ color: tema.texto }}>{p.nombre || p.sku}</div>
                  <div style={{ color: '#e23a3a' }}>{p.stock}</div>
                </div>
              )) : <div style={{ color: tema.borde }}>No hay productos críticos</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventario;
