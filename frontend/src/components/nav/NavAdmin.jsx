// src/components/NavAdmin.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { temas } from '../../styles/temas';
import CambioTema from '../CambioTema';
import CambioIdioma from '../CambioIdioma';
import {
  FaUsers, FaUserFriends, FaBoxOpen, FaBuilding, FaUserTie,
  FaChartLine, FaDatabase, FaFileImport, FaFileExport, FaBars, FaSignOutAlt, FaUserCog, FaHome,
  FaRegImages, FaImages, FaVideo, FaFilm, FaBook
} from 'react-icons/fa';

const THEME_KEY = 'app_theme_selected';
const COLLAPSE_KEY = 'app_nav_collapsed';


const NavAdmin = ({ onNavigate, onLogout }) => {
  const [themeKey, setThemeKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
  const tema = temas[themeKey] || temas.bosque_claro;

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });

  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => { try { localStorage.setItem(THEME_KEY, themeKey); } catch {} }, [themeKey]);
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch {} }, [collapsed]);

  const handleNav = (ruta) => {
    if (typeof onNavigate === 'function') onNavigate(ruta);
    else window.location.hash = ruta;
  };

  const handleLogout = () => {
    if (typeof onLogout === 'function') return onLogout();
    try { localStorage.removeItem('app_auth_user'); localStorage.removeItem('app_auth_token'); } catch {}
    window.location.hash = '#/login';
  };

  const toggleCollapse = () => setCollapsed(c => !c);

  const AsideStyle = {
    background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
    minHeight: '100vh',
    padding: collapsed ? 12 : 18,
    boxSizing: 'border-box',
    borderRight: `1px solid ${tema.borde}`,
    color: tema.texto,
    width: collapsed ? 84 : 'clamp(200px, 22vw, 260px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'width 220ms cubic-bezier(.2,.9,.2,1), padding 220ms ease'
  };

  const menuButtonBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: collapsed ? 10 : '10px 12px',
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: tema.texto,
    fontWeight: 700,
    width: '100%',
    transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease'
  };

  const menuHover = (el) => {
    el.style.transform = 'translateY(-3px)';
    el.style.boxShadow = `0 8px 20px ${tema.acento}22`;
    el.style.background = collapsed ? 'rgba(255,255,255,0.92)' : '#fff';
  };
  const menuUnhover = (el) => {
    el.style.transform = 'translateY(0)';
    el.style.boxShadow = 'none';
    el.style.background = 'transparent';
  };

  const MenuGroup = ({ id, icon, label, items }) => {
    const wrapperRef = useRef(null);
    const innerRef = useRef(null);
    const isOpen = openMenu === id;

    useEffect(() => {
      if (!wrapperRef.current || !innerRef.current) return;
      if (isOpen) {
        const h = innerRef.current.scrollHeight;
        wrapperRef.current.style.display = 'block';
        wrapperRef.current.style.height = `${h}px`;
        wrapperRef.current.style.opacity = '1';
        wrapperRef.current.style.transform = 'translateY(0)';
      } else {
        wrapperRef.current.style.height = '0px';
        wrapperRef.current.style.opacity = '0';
        wrapperRef.current.style.transform = 'translateY(-6px)';
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, themeKey, collapsed]);

    useEffect(() => {
      const onAuthChange = (e) => {
        if (e?.type === 'storage') {
          if (e.key === 'app_auth_token' || e.key === 'app_auth_user' || e.key === null) {
            try {
              const token = localStorage.getItem('app_auth_token');
              if (!token) window.location.hash = '#/login';
            } catch { window.location.hash = '#/login'; }
          } else if (e.key === THEME_KEY) {
            setThemeKey(e.newValue || 'bosque_claro');
          } else if (e.key === COLLAPSE_KEY) {
            setCollapsed(e.newValue === '1');
          }
        } else if (e?.type === 'auth:changed' || e === 'auth:changed') {
          try {
            const token = localStorage.getItem('app_auth_token');
            if (!token) {
              window.location.hash = '#/login';
            }
          } catch {
            window.location.hash = '#/login';
          }
        }
      };

      const onAuthChangedEvent = () => onAuthChange('auth:changed');

      window.addEventListener('storage', onAuthChange);
      window.addEventListener('auth:changed', onAuthChangedEvent);
      return () => {
        window.removeEventListener('storage', onAuthChange);
        window.removeEventListener('auth:changed', onAuthChangedEvent);
      };
    }, []);

    const openSmooth = () => {
      const wrap = wrapperRef.current;
      const inner = innerRef.current;
      if (!wrap || !inner) return;
      wrap.style.display = 'block';
      wrap.style.overflow = 'hidden';
      wrap.style.transition = 'height 320ms cubic-bezier(.2,.9,.2,1), opacity 240ms ease, transform 240ms ease';
      wrap.style.height = `${inner.scrollHeight}px`;
      wrap.style.opacity = '1';
      wrap.style.transform = 'translateY(0)';
      setOpenMenu(id);
    };
    const closeSmooth = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      wrap.style.overflow = 'hidden';
      wrap.style.transition = 'height 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease, transform 200ms ease';
      wrap.style.height = '0px';
      wrap.style.opacity = '0';
      wrap.style.transform = 'translateY(-6px)';
      setOpenMenu(prev => (prev === id ? null : prev));
    };

    return (
      <div
        onMouseEnter={() => openSmooth()}
        onMouseLeave={() => closeSmooth()}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <button
          onClick={() => setOpenMenu(prev => (prev === id ? null : id))}
          aria-expanded={isOpen}
          aria-controls={`${id}-submenu`}
          style={menuButtonBase}
          onMouseEnter={(e) => menuHover(e.currentTarget)}
          onMouseLeave={(e) => menuUnhover(e.currentTarget)}
        >
          <div style={{ width: 28, display: 'flex', justifyContent: 'center', color: tema.primario }}>{icon}</div>
          {!collapsed && <div style={{ flex: 1 }}>{label}</div>}
          {!collapsed && <div style={{ opacity: 0.75 }}>{isOpen ? '▾' : '▸'}</div>}
        </button>

        <div
          id={`${id}-submenu`}
          ref={wrapperRef}
          style={{
            height: 0,
            overflow: 'hidden',
            opacity: 0,
            transform: 'translateY(-6px)',
            transition: 'height 320ms cubic-bezier(.2,.9,.2,1), opacity 240ms ease, transform 240ms ease',
            display: 'block',
            paddingLeft: collapsed ? 0 : 36
          }}
          aria-hidden={!isOpen}
        >
          <div ref={innerRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 6 }}>
            {items.map((it, idx) => (
              <button
                key={idx}
                onClick={() => handleNav(it.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? 8 : '8px 10px',
                  paddingLeft: collapsed ? 8 : 0,
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: tema.texto,
                  fontSize: 13,
                  transition: 'transform 160ms ease, box-shadow 160ms ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 18px ${tema.acento}22`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                title={it.label}
              >
                <div style={{ width: 18, display: 'flex', justifyContent: 'center', color: tema.secundario }}>{it.icon}</div>
                {!collapsed && <div>{it.label}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // cambio de idioma
  // Obtener la función de traducción (t) y la instancia (i18n)
  const { t, i18n } = useTranslation();

  // language change handler (ahora usa i18next)
  const onLanguageChange = (newLang) => {
    // Esto cambiará el idioma en toda la app y lo guardará
    // (si configuraste el languagedetector para usar localStorage)
    i18n.changeLanguage(newLang);
  };

  return (
    <aside style={AsideStyle} aria-label="Navegación administración">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header: título breve + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!collapsed && <div style={{ fontSize: 18, fontWeight: 900, color: tema.texto }}>{t('nav.adminTitle')}</div>}
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={toggleCollapse}
              aria-label={collapsed ? t('nav.expandNav') : t('nav.collapseNav')}
              title={collapsed ? t('nav.expandNav') : t('nav.collapseNav')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                background: tema.primario,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 8px 22px ${tema.acento}33`
              }}
            >
              <FaBars />
            </button>
          </div>
        </div>

        {/* Navigation groups */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Botón Inicio colocado encima del grupo CRUDs, respetando diseño */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : '4px 0 6px 8px' }}>
            <button
              onClick={() => handleNav('#/admin/dashboard')}
              title={t('nav.home')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? 8 : '8px 12px',
                borderRadius: 10,
                background: collapsed ? 'transparent' : `linear-gradient(180deg, ${tema.primario}, ${tema.acento})`,
                color: collapsed ? tema.texto : '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: collapsed ? 'none' : `0 10px 26px ${tema.acento}33`,
                width: '100%',
                fontWeight: 800,
                justifyContent: collapsed ? 'center' : 'flex-start'
              }}
              onMouseEnter={(e) => {
                if (!collapsed) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 18px 36px ${tema.acento}44`; }
              }}
              onMouseLeave={(e) => {
                if (!collapsed) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 10px 26px ${tema.acento}33`; }
              }}
            >
              <div style={{ width: 20, display: 'flex', justifyContent: 'center', color: collapsed ? tema.primario : '#fff' }}>
                <FaHome />
              </div>
              {!collapsed && <div style={{ fontSize: 14 }}>{t('nav.home')}</div>}
            </button>
          </div>

          <MenuGroup
  id="cruds"
  icon={<FaUserCog />}
  label={t('nav.cruds')}
  items={[
    { label: t('cruds.users'), path: '#/admin/usuarios/DashboardU', icon: <FaUsers /> },
    { label: t('cruds.products'), path: '#/admin/productos/DashboardP', icon: <FaBoxOpen /> },
    { label: t('cruds.areas'), path: '#/admin/areas/DashboardA', icon: <FaBuilding /> }
  ]}
/>

          <MenuGroup
  id="reportes"
  icon={<FaChartLine />}
  label={t('nav.reports')}
  items={[
    { label: t('reports.sales'), path: '#/admin/reportes/ReportesV', icon: <FaChartLine /> },
    { label: t('reports.analysis'), path: '#/admin/reportes/AnalisisV', icon: <FaBook /> },
    { label: t('reports.generalAnalysis'), path: '#/admin/spark/analisis', icon: <FaBook /> }
  ]}
/>

          <MenuGroup
            id="bd"
            icon={<FaDatabase />}
            label={t('nav.database')}
            items={[
              { label: t('bd.backups'), path: '#/admin/bd/backups', icon: <FaFileExport /> },
              { label: t('bd.import'), path: '#/admin/bd/importar', icon: <FaFileImport /> }
            ]}
          />

          <MenuGroup
            id="multimedia"
            icon={<FaFilm />}
            label={t('nav.multimedia')}
            items={[
              { label: t('multimedia.images'), path: '#/admin/multimedia/imagenes', icon: <FaImages /> },
              { label: t('multimedia.photos'), path: '#/admin/multimedia/fotos', icon: <FaRegImages /> },
              { label: t('multimedia.videos'), path: '#/admin/multimedia/videos', icon: <FaVideo /> }
            ]}
          />
        </nav>
      </div>

      {/* Footer: CambioIdioma arriba de CambioTema y Cerrar sesión (CambioTema y Logout mantienen su posición relativa original) */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: collapsed ? 'center' : 'stretch',
        justifyContent: 'flex-end',
        paddingTop: 6
      }}>
        {/* Row 1: CambioIdioma centered above the theme + logout row */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: collapsed ? 40 : 160 }}>
            <CambioIdioma onChange={onLanguageChange} defaultLang={i18n.language} />
          </div>
        </div>

        {/* Row 2: same horizontal layout as before: CambioTema on left (or centered when collapsed) and Logout on right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <div style={{ width: collapsed ? 0 : 140, transition: 'width 180ms ease', display: collapsed ? 'none' : 'block' }}>
              <CambioTema value={themeKey} onChange={(k) => { setThemeKey(k); try { localStorage.setItem(THEME_KEY, k); } catch {} }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? 10 : '10px 14px',
                borderRadius: 10,
                background: `linear-gradient(180deg, ${tema.primario}, ${tema.acento})`,
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: `0 12px 28px ${tema.acento}33`,
                transition: 'transform 140ms ease, box-shadow 140ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 18px 36px ${tema.acento}44`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 12px 28px ${tema.acento}33`; }}
              title={t('nav.logout')}
            >
              <FaSignOutAlt />
              {!collapsed && <span>{t('nav.logout')}</span>}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default NavAdmin;
