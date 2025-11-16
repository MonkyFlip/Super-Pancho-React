import React, { useEffect, useState, useRef, useCallback } from 'react';
import { temas } from '../styles/temas';
import { FaGlobe } from 'react-icons/fa';

const LANG_KEY = 'app_selected_language';
const THEME_KEY = 'app_theme_selected';

export default function CambioIdioma({
  locales,
  defaultLang = 'es',
  collapsed = false,
  onChange,
  direction = 'up' // Cambiado por defecto a 'down'
}) {
  const available = Array.isArray(locales) && locales.length > 0 ? locales : [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' }
  ];

  const readStoredLang = useCallback(() => {
    try {
      return localStorage.getItem(LANG_KEY) || defaultLang;
    } catch {
      return defaultLang;
    }
  }, [defaultLang]);

  const readThemeKey = useCallback(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'bosque_claro';
    } catch {
      return 'bosque_claro';
    }
  }, []);

  const [lang, setLang] = useState(readStoredLang);
  const [themeKey, setThemeKey] = useState(readThemeKey);
  const tema = temas[themeKey] || temas.bosque_claro;

  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    try { 
      if (document && document.documentElement) {
        document.documentElement.lang = lang || '';
      }
    } catch {}
  }, [lang]);

  const applyLang = useCallback((newLang) => {
    try { localStorage.setItem(LANG_KEY, newLang); } catch {}
    setLang(newLang);
    try { 
      if (document && document.documentElement) {
        document.documentElement.lang = newLang;
      }
    } catch {}
    if (typeof onChange === 'function') onChange(newLang);
  }, [onChange]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target) && 
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Estilos corregidos
  const btnStyle = {
    width: 38,
    height: 38,
    display: 'inline-grid',
    placeItems: 'center',
    borderRadius: '50%',
    background: tema.fondo_card,
    color: tema.texto,
    border: `1px solid ${tema.borde}`,
    cursor: 'pointer',
    fontSize: 16,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: tema.borde,
      color: tema.primario,
    }
  };

  const menuContainerStyle = {
    position: 'absolute',
    right: 0,
    top: direction === 'down' ? 'calc(100% + 8px)' : 'auto',
    bottom: direction === 'up' ? 'calc(100% + 8px)' : 'auto',
    minWidth: 140,
    background: tema.fondo_card,
    border: `1px solid ${tema.borde}`,
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: 8,
    zIndex: 1000
  };

  const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 6,
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    color: tema.texto,
    fontSize: 14,
    transition: 'all 0.2s ease'
  };

  const selectedBadge = {
    marginLeft: 'auto',
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 10,
    background: tema.primario,
    color: '#fff',
    fontWeight: 600
  };

  const wrapperStyle = {
    position: 'relative',
    display: 'inline-block'
  };

  return (
    <div style={wrapperStyle}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cambiar idioma"
        onClick={() => setOpen(v => !v)}
        style={btnStyle}
        title="Idioma"
      >
        <FaGlobe />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Seleccionar idioma"
          style={menuContainerStyle}
        >
          <div style={{ 
            marginBottom: 8, 
            fontWeight: 600, 
            color: tema.texto,
            fontSize: 13,
            padding: '0 4px'
          }}>
            Idioma
          </div>

          {available.map(({ code, label }) => {
            const isSel = code === lang;
            return (
              <button
                key={code}
                role="menuitem"
                tabIndex={0}
                onClick={() => { applyLang(code); setOpen(false); }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' || e.key === ' ') { 
                    e.preventDefault(); 
                    applyLang(code); 
                    setOpen(false); 
                  } 
                }}
                style={{
                  ...menuItemStyle,
                  background: isSel ? `${tema.primario}15` : 'transparent',
                  fontWeight: isSel ? 600 : 400
                }}
                onMouseEnter={(e) => {
                  if (!isSel) {
                    e.currentTarget.style.background = `${tema.primario}08`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSel) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  display: 'grid',
                  placeItems: 'center',
                  background: isSel ? tema.primario : 'transparent',
                  color: isSel ? '#fff' : tema.texto,
                  fontSize: 10,
                  fontWeight: 700,
                  border: isSel ? 'none' : `1px solid ${tema.borde}`
                }}>
                  {label.charAt(0).toUpperCase()}
                </div>

                <span style={{ flex: 1, fontSize: 13 }}>{label}</span>

                {isSel && <div style={selectedBadge}>✓</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}