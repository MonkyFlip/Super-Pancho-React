// InicioNav.jsx
import React from 'react';
import { temas } from '../styles/temas';

const THEME_KEY = 'app_theme_selected';

/**
 * InicioNav muestra título y subtítulo según rol
 * Compatible con tema seleccionado
 */
const InicioNav = ({ rol = 'cliente' }) => {
  let themeKey = 'bosque_claro';
  try { themeKey = localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch {}
  const tema = temas[themeKey] || temas.bosque_claro;

  const titleMap = {
    administrador: 'Panel Administrador',
    trabajador: 'Panel Trabajador',
    cliente: 'Bienvenido'
  };
  const subtitleMap = {
    administrador: 'Control y gestión del sistema',
    trabajador: 'Operaciones, inventario y ventas',
    cliente: 'Explora, compra y revisa tus pedidos'
  };

  return (
    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: tema.texto }}>{titleMap[rol] || 'Panel'}</div>
      <div style={{ fontSize: 12, color: tema.borde }}>{subtitleMap[rol] || ''}</div>
    </div>
  );
};

export default InicioNav;
