// Navbar.jsx
import React, { useEffect, useState } from 'react';
import { temas } from '../styles/temas';
import InicioNav from './InicioNav';

const THEME_KEY = 'app_theme_selected';

/**
 * Navbar lateral con:
 * - íconos en cada botón
 * - colapsado/expandido con animación suave
 * - cuando está colapsado muestra solo íconos y un botón pestaña para abrirlo
 * - los menús mantienen su lógica por rol (administrador/trabajador/cliente)
 *
 * onNavigate: callback opcional (ruta) -> por defecto window.location.hash
 */
const Navbar = ({ rol = 'cliente', onNavigate }) => {
  const [themeKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
  const tema = temas[themeKey] || temas.bosque_claro;

  const [openMenus, setOpenMenus] = useState({
    crud: false,
    reportes: false,
    bd: false,
    operaciones: false,
    tienda: false
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_nav_collapsed');
      if (stored !== null) setCollapsed(stored === '1');
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('app_nav_collapsed', collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  const toggleMenu = (key) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  const handleNav = (ruta) => {
    if (typeof onNavigate === 'function') onNavigate(ruta);
    else window.location.hash = ruta;
  };

  // estilos básicos adaptados al tema
  const asideStyle = {
    width: collapsed ? 64 : 260,
    minHeight: '100vh',
    background: tema.fondo,
    color: tema.texto,
    borderRight: `1px solid ${tema.borde}`,
    boxShadow: `4px 0 18px ${tema.acento}22`,
    display: 'flex',
    flexDirection: 'column',
    padding: 8,
    boxSizing: 'border-box',
    transition: 'width 260ms cubic-bezier(.2,.9,.2,1)',
    position: 'relative',
    overflow: 'visible'
  };

  const topBarStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 6px',
    marginBottom: 8
  };

  const iconOnlyStyle = {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: tema.texto
  };

  const menuRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 8px',
    borderRadius: 8,
    cursor: 'pointer',
    color: tema.texto
  };

  const submenuStyle = {
    paddingLeft: collapsed ? 8 : 18,
    marginTop: 6,
    marginBottom: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  };

  // Iconos SVG simples (usando colores del tema)
  const icons = {
    inicio: (size = 18) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5z" fill={tema.texto} /></svg>
    ),
    usuarios: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a6 6 0 0 1 14 0" fill={tema.texto} /></svg>
    ),
    productos: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" fill={tema.texto} /></svg>
    ),
    clientes: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M16 11a4 4 0 1 0-8 0v5h8v-5zM6 20v-2a4 4 0 0 1 4-4h0" stroke={tema.texto} strokeWidth="1.2" fill="none"/></svg>
    ),
    ventas: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 6h18v12H3zM7 12h10" stroke={tema.texto} strokeWidth="1.4" fill="none"/></svg>
    ),
    areas: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6" r="2.5" fill={tema.texto}/><circle cx="12" cy="12" r="2.5" fill={tema.texto}/><circle cx="18" cy="18" r="2.5" fill={tema.texto}/></svg>
    ),
    reportes: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 3h18v18H3z" stroke={tema.texto} strokeWidth="1.2" fill="none"/></svg>
    ),
    bd: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2v4M5 7v6a7 7 0 0 0 14 0V7" stroke={tema.texto} strokeWidth="1.2" fill="none"/></svg>
    ),
    tienda: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 7h18v2l-1 9H4L3 9V7z" stroke={tema.texto} strokeWidth="1.2" fill="none"/></svg>
    ),
    carrito: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6h15l-1.5 9h-11L6 6z" stroke={tema.texto} strokeWidth="1.2" fill="none"/><circle cx="9" cy="20" r="1" fill={tema.texto}/><circle cx="18" cy="20" r="1" fill={tema.texto}/></svg>
    ),
    tareas: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 6h16M8 10h8M8 14h8" stroke={tema.texto} strokeWidth="1.2" fill="none"/></svg>
    ),
    turno: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3 3" stroke={tema.texto} strokeWidth="1.2" fill="none"/></svg>
    ),
    ayuda: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 18h.01M12 14a2 2 0 1 0-2-2" stroke={tema.texto} strokeWidth="1.2" fill="none"/></svg>
    ),
    cerrar: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="1.6" /></svg>
    ),
    toggle: (s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 12h16M10 6h8M6 18h8" stroke={tema.texto} strokeWidth="1.4" fill="none"/></svg>
    )
  };

  // fila del menú (icon + texto)
  const MenuItem = ({ icon, label, badge, onClick, collapsedRow }) => (
    <div
      onClick={onClick}
      style={{
        ...menuRowStyle,
        justifyContent: collapsedRow ? 'center' : 'flex-start',
        padding: collapsedRow ? 8 : '10px 8px'
      }}
      title={label}
    >
      <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      {!collapsedRow && <div style={{ flex: 1, fontSize: 14 }}>{label}</div>}
      {!collapsedRow && badge}
    </div>
  );

  return (
    <aside style={asideStyle}>
      <div style={topBarStyle}>
        {!collapsed ? (
          <div style={{ flex: 1 }}>
            <InicioNav rol={rol} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{icons.inicio(20)}</div>
        )}

        {/* Toggle collapse */}
        <button
          aria-label={collapsed ? 'Expandir barra' : 'Colapsar barra'}
          onClick={() => setCollapsed(c => !c)}
          style={{
            ...iconOnlyStyle,
            borderRadius: 10,
            background: collapsed ? tema.primario : 'transparent',
            color: collapsed ? '#fff' : tema.texto,
            boxShadow: collapsed ? `0 8px 22px ${tema.acento}33` : 'none'
          }}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {icons.toggle(18)}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px' }}>
        <MenuItem
          icon={icons.inicio(18)}
          label="Inicio"
          onClick={() => handleNav('#/inicio')}
          collapsedRow={collapsed}
        />

        {rol === 'administrador' && (
          <>
            <div style={{ marginTop: 6, paddingLeft: collapsed ? 6 : 10, color: tema.borde, fontSize: 12 }}>Administración</div>

            <div>
              <div onClick={() => toggleMenu('crud')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? 8 : '10px 8px', cursor: 'pointer' }}>
                <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>{icons.usuarios(18)}</div>
                {!collapsed && <div style={{ flex: 1 }}>CRUD'S</div>}
                {!collapsed && <div>{openMenus.crud ? '▾' : '▸'}</div>}
              </div>
              {openMenus.crud && (
                <div style={submenuStyle}>
                  <MenuItem icon={icons.usuarios(16)} label="Usuarios" onClick={() => handleNav('#/crud/usuarios')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.productos(16)} label="Productos" onClick={() => handleNav('#/crud/productos')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.clientes(16)} label="Clientes" onClick={() => handleNav('#/crud/clientes')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.ventas(16)} label="Ventas" onClick={() => handleNav('#/crud/ventas')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.areas(16)} label="Áreas" onClick={() => handleNav('#/crud/areas')} collapsedRow={collapsed} />
                </div>
              )}
            </div>

            <div>
              <div onClick={() => toggleMenu('reportes')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? 8 : '10px 8px', cursor: 'pointer' }}>
                <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>{icons.reportes(18)}</div>
                {!collapsed && <div style={{ flex: 1 }}>Reportes</div>}
                {!collapsed && <div>{openMenus.reportes ? '▾' : '▸'}</div>}
              </div>
              {openMenus.reportes && (
                <div style={submenuStyle}>
                  <MenuItem icon={icons.productos(16)} label="Análisis de Inventario" onClick={() => handleNav('#/reportes/inventario')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.reportes(16)} label="Reportes de Estadísticas" onClick={() => handleNav('#/reportes/estadisticas')} collapsedRow={collapsed} />
                </div>
              )}
            </div>

            <div>
              <div onClick={() => toggleMenu('bd')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? 8 : '10px 8px', cursor: 'pointer' }}>
                <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>{icons.bd(18)}</div>
                {!collapsed && <div style={{ flex: 1 }}>Base de Datos</div>}
                {!collapsed && <div>{openMenus.bd ? '▾' : '▸'}</div>}
              </div>
              {openMenus.bd && (
                <div style={submenuStyle}>
                  <MenuItem icon={icons.bd(16)} label="Exportar BD" onClick={() => handleNav('#/bd/exportar')} collapsedRow={collapsed} />
                </div>
              )}
            </div>
          </>
        )}

        {rol === 'trabajador' && (
          <>
            <div style={{ marginTop: 6, paddingLeft: collapsed ? 6 : 10, color: tema.borde, fontSize: 12 }}>Operaciones</div>

            <div>
              <div onClick={() => toggleMenu('operaciones')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? 8 : '10px 8px', cursor: 'pointer' }}>
                <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>{icons.turno(18)}</div>
                {!collapsed && <div style={{ flex: 1 }}>Operaciones</div>}
                {!collapsed && <div>{openMenus.operaciones ? '▾' : '▸'}</div>}
              </div>
              {openMenus.operaciones && (
                <div style={submenuStyle}>
                  <MenuItem icon={icons.turno(16)} label="Turnos" onClick={() => handleNav('#/turnos')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.tareas(16)} label="Tareas" onClick={() => handleNav('#/tareas')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.ventas(16)} label="Registrar Venta" onClick={() => handleNav('#/ventas/registro')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.productos(16)} label="Inventario" onClick={() => handleNav('#/productos/inventario')} collapsedRow={collapsed} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <MenuItem icon={icons.reportes(18)} label="Mi actividad" onClick={() => handleNav('#/reportes/mi-actividad')} collapsedRow={collapsed} />
            </div>
          </>
        )}

        {rol === 'cliente' && (
          <>
            <div style={{ marginTop: 6, paddingLeft: collapsed ? 6 : 10, color: tema.borde, fontSize: 12 }}>Tienda</div>

            <div>
              <div onClick={() => toggleMenu('tienda')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? 8 : '10px 8px', cursor: 'pointer' }}>
                <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>{icons.tienda(18)}</div>
                {!collapsed && <div style={{ flex: 1 }}>Catálogo</div>}
                {!collapsed && <div>{openMenus.tienda ? '▾' : '▸'}</div>}
              </div>

              {openMenus.tienda && (
                <div style={submenuStyle}>
                  <MenuItem icon={icons.productos(16)} label="Productos" onClick={() => handleNav('#/tienda/productos')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.productos(16)} label="Ofertas" onClick={() => handleNav('#/tienda/ofertas')} collapsedRow={collapsed} />
                  <MenuItem icon={icons.productos(16)} label="Mis pedidos" onClick={() => handleNav('#/tienda/mis-pedidos')} collapsedRow={collapsed} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <MenuItem icon={icons.carrito(18)} label="Carrito" onClick={() => handleNav('#/carrito')} collapsedRow={collapsed} />
            </div>

            <div style={{ marginTop: 8 }}>
              <MenuItem icon={icons.ayuda(18)} label="Ayuda y soporte" onClick={() => handleNav('#/soporte')} collapsedRow={collapsed} />
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 'auto', padding: '12px 6px' }}>
        <button
          onClick={() => handleNav('#/salir')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '10px 6px' : '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: tema.primario,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            boxShadow: `0 8px 20px ${tema.acento}33`
          }}
          title="Cerrar sesión"
        >
          <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>{icons.cerrar(16)}</div>
          {!collapsed && <div style={{ flex: 1 }}>Cerrar sesión</div>}
        </button>
      </div>

      {/* pestaña cuando está colapsado para expandir (visible en borde derecho) */}
      {collapsed && (
        <button
          aria-label="Abrir navegación"
          onClick={() => setCollapsed(false)}
          style={{
            position: 'absolute',
            right: -18,
            top: 100,
            width: 36,
            height: 72,
            borderRadius: 8,
            border: `1px solid ${tema.borde}`,
            background: tema.primario,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: `2px 6px 18px ${tema.acento}44`,
            cursor: 'pointer'
          }}
          title="Abrir menú"
        >
          {icons.toggle(18)}
        </button>
      )}
    </aside>
  );
};

export default Navbar;
