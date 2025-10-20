// KPICard.jsx
import React from 'react';
import { temas } from '../../styles/temas';

const THEME_KEY = 'app_theme_selected';

/**
 * KPICard
 * Props:
 * - title (string)
 * - value (string|number)
 * - delta (optional number, + or -)
 * - icon (optional node)
 */
const KPICard = ({ title, value, delta, icon }) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const deltaColor = delta == null ? tema.borde : (delta >= 0 ? '#1f9d55' : '#e23a3a');
  return (
    <div style={{
      background: tema.fondo,
      border: `1px solid ${tema.borde}`,
      borderRadius: 12,
      padding: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: `0 8px 30px ${tema.acento}11`
    }}>
      {icon && <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 8, background: tema.secundario }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: tema.borde }}>{title}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: tema.texto }}>{value}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {delta != null && <div style={{ fontSize: 13, color: deltaColor }}>{delta > 0 ? `+${delta}%` : `${delta}%`}</div>}
      </div>
    </div>
  );
};

export default KPICard;
