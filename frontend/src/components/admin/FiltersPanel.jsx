// FiltersPanel.jsx
import React, { useState, useEffect } from 'react';
import { temas } from '../../styles/temas';

const THEME_KEY = 'app_theme_selected';

/**
 * FiltersPanel
 * Props:
 * - initial (object) initial filters
 * - onApply(filters) called when user applies filters
 * - onReset() optional
 *
 * Diseño compacto: campo de búsqueda, select de estado, filtro de fechas.
 * La implementación del datepicker queda abstracta (usa input type=date para simpleza).
 */
const FiltersPanel = ({ initial = {}, onApply = () => {}, onReset = () => {} }) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const [q, setQ] = useState(initial.q || '');
  const [estado, setEstado] = useState(initial.estado || '');
  const [desde, setDesde] = useState(initial.desde || '');
  const [hasta, setHasta] = useState(initial.hasta || '');

  useEffect(() => {
    setQ(initial.q || '');
    setEstado(initial.estado || '');
    setDesde(initial.desde || '');
    setHasta(initial.hasta || '');
  }, [initial]);

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    background: tema.secundario,
    color: tema.texto
  };

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${tema.borde}`,
      padding: 12,
      background: tema.fondo,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{ fontSize: 13, color: tema.borde, fontWeight: 700 }}>Filtros</div>

      <div>
        <label style={{ fontSize: 12, color: tema.borde }}>Buscar</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." style={inputStyle} />
      </div>

      <div>
        <label style={{ fontSize: 12, color: tema.borde }}>Estado</label>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: tema.borde }}>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: tema.borde }}>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
        <button onClick={() => { setQ(''); setEstado(''); setDesde(''); setHasta(''); if (typeof onReset === 'function') onReset(); }} style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: `1px solid ${tema.borde}`,
          background: tema.secundario,
          color: tema.texto
        }}>Limpiar</button>

        <button onClick={() => onApply({ q, estado, desde, hasta })} style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: 'none',
          background: tema.primario,
          color: '#fff',
          fontWeight: 700
        }}>Aplicar</button>
      </div>
    </div>
  );
};

export default FiltersPanel;
