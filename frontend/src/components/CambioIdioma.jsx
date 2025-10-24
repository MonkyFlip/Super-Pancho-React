// src/components/CambioIdioma.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { temas } from '../styles/temas';
import { FaGlobe } from 'react-icons/fa';

const LANG_KEY = 'app_selected_language';
const THEME_KEY = 'app_theme_selected';

/**
 * CambioIdioma
 * - Botón icono (similar a CambioTema) que al hacer clic abre un menú desplegable de idiomas.
 * - Persistencia en localStorage (LANG_KEY).
 * - Actualiza document.documentElement.lang.
 * - Emite evento custom 'app:language-changed' (detail: { lang }).
 * - Observa THEME_KEY para adaptar colores al tema.
 *
 * Props:
 * - locales: [{ code, label }]  (opcional)
 * - defaultLang: 'es' (opcional)
 * - collapsed: boolean (si el nav está colapsado) -> muestra solo icono
 * - onChange: fn(newLang) callback
 */
export default function CambioIdioma({
  locales,
  defaultLang = 'es',
  collapsed = false,
  onChange
}) {
  const available = Array.isArray(locales) && locales.length > 0 ? locales : [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' }
  ];

  const readStoredLang = useCallback(() => {
    try { return localStorage.getItem(LANG_KEY) || defaultLang; } catch { return defaultLang; }
  }, [defaultLang]);

  const readThemeKey = useCallback(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  }, []);

  const [lang, setLang] = useState(readStoredLang);
  const [themeKey, setThemeKey] = useState(readThemeKey);
  const tema = temas[themeKey] || temas.bosque_claro;

  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // apply lang to document root
  useEffect(() => {
    try { if (document && document.documentElement) document.documentElement.lang = lang || ''; } catch {}
  }, [lang]);

  // persist language & notify
  const applyLang = useCallback((newLang) => {
    try { localStorage.setItem(LANG_KEY, newLang); } catch {}
    setLang(newLang);
    try { if (document && document.documentElement) document.documentElement.lang = newLang; } catch {}
    try { window.dispatchEvent(new CustomEvent('app:language-changed', { detail: { lang: newLang } })); } catch {}
    if (typeof onChange === 'function') onChange(newLang);
  }, [onChange]);

  // close menu on outside click or Esc
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target) && buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('touchstart', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('touchstart', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // listen for storage changes from other tabs (theme or language)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === LANG_KEY && e.newValue && e.newValue !== lang) {
        setLang(e.newValue);
        try { if (document && document.documentElement) document.documentElement.lang = e.newValue; } catch {}
        if (typeof onChange === 'function') onChange(e.newValue);
      }
      if (e.key === THEME_KEY && e.newValue && e.newValue !== themeKey) {
        setThemeKey(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [lang, themeKey, onChange]);

  // keyboard navigation: focus first item when open
  useEffect(() => {
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector('button[role="menuitem"]');
      if (first) first.focus();
    }
  }, [open]);

  // styles consistent with NavAdmin: compact, themed
  const btnStyle = {
    width: collapsed ? 40 : 44,
    height: 44,
    display: 'inline-grid',
    placeItems: 'center',
    borderRadius: 10,
    background: collapsed ? 'transparent' : tema.primario,
    color: collapsed ? tema.texto : '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: collapsed ? 'none' : `0 8px 22px ${tema.acento}33`
  };

  const menuContainerStyle = {
    position: 'absolute',
    right: 12,
    bottom: 'calc(100% + 8px)',
    minWidth: 160,
    background: tema.fondo_card || '#fff',
    border: `1px solid ${tema.borde}`,
    borderRadius: 10,
    boxShadow: tema.sombra || '0 12px 30px rgba(8,15,30,0.08)',
    padding: 8,
    zIndex: 1200
  };

  const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    color: tema.texto,
    fontWeight: 700,
    transition: 'background 140ms ease, transform 140ms ease'
  };

  const selectedBadge = {
    marginLeft: 'auto',
    fontSize: 12,
    padding: '2px 6px',
    borderRadius: 999,
    background: tema.primario,
    color: '#fff',
    fontWeight: 800
  };

  // responsive placement: when collapsed, menu centered under button; when expanded, align with nav width
  const wrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: collapsed ? 40 : 'auto'
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
          <div style={{ marginBottom: 6, fontWeight: 800, color: tema.texto }}>Idioma</div>

          {available.map(({ code, label }) => {
            const isSel = code === lang;
            return (
              <button
                key={code}
                role="menuitem"
                tabIndex={0}
                onClick={() => { applyLang(code); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyLang(code); setOpen(false); } }}
                style={{
                  ...menuItemStyle,
                  background: isSel ? (tema.primario + '14') : 'transparent'
                }}
                title={label}
              >
                <div style={{ width: 28, display: 'flex', justifyContent: 'center', color: tema.secundario }}>
                  {/* simple circular initial as icon to keep visual rhythm */}
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: isSel ? tema.primario : 'transparent',
                    color: isSel ? '#fff' : tema.secundario,
                    fontSize: 12,
                    fontWeight: 800
                  }}>
                    {label.charAt(0)}
                  </div>
                </div>

                <div style={{ flex: 1 }}>{label}</div>

                {isSel && <div style={selectedBadge}>OK</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
