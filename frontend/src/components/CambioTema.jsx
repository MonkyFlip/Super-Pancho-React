// src/components/CambioTema.jsx
import React, { useEffect, useRef, useState } from 'react';
import { temas } from '../styles/temas';

const STORAGE_KEY = 'app_theme_selected';

/**
 * CambioTema
 * - Versión que muestra el popover hacia arriba (por encima del botón).
 * - Props: value, onChange, align ('left' | 'right') — align controla el anclaje horizontal.
 */
const CambioTema = ({ value, onChange, align = 'left' }) => {
  const themeKeys = Object.keys(temas);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || value || 'bosque_claro'; } catch { return value || 'bosque_claro'; }
  });
  const rootRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, selected); } catch {}
    if (typeof onChange === 'function') onChange(selected);
  }, [selected, onChange]);

  useEffect(() => { if (value && value !== selected) setSelected(value); }, [value]);

  useEffect(() => {
    const onDown = (e) => { if (!rootRef.current) return; if (!rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const btnStyle = {
    display: 'inline-grid',
    placeItems: 'center',
    width: 48,
    height: 48,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    transition: 'transform 160ms ease, box-shadow 160ms ease'
  };

  const handleSelect = (key) => {
    setSelected(key);
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block', zIndex: 4000 }}>
      <button
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        title="Cambiar tema"
        style={{ ...btnStyle, background: temas[selected].primario, color: '#fff' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3C7 3 3 7 3 12s4 7 8 7c.9 0 1.7-.2 2.4-.5.8-.4 1.6.1 1.9.8.6 1.3 2.1 2.2 3.7 2.2 1.4 0 2.6-.6 3.5-1.6.7-.8.5-2.1-.5-2.7-1.6-1-2.8-2.6-3.1-4.5C19.3 7.5 15.9 4 12 3z" fill="#fff"/>
        </svg>
      </button>

      {/* Popover: aparece hacia arriba */}
      <div
        ref={popRef}
        role="dialog"
        aria-hidden={!open}
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',   // <-- aquí se coloca arriba del botón
          [align]: 0,
          width: 320,
          maxWidth: 'clamp(220px, 40vw, 420px)',
          background: '#ffffff',
          borderRadius: 12,
          padding: 12,
          boxShadow: '0 20px 48px rgba(16,24,40,0.08)',
          transformOrigin: align === 'left' ? 'bottom left' : 'bottom right',
          pointerEvents: open ? 'auto' : 'none',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)', // sube desde abajo
          transition: 'opacity 220ms ease, transform 220ms cubic-bezier(.2,.9,.2,1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#111' }}>Temas</div>
          <div style={{ fontSize: 12, color: '#666' }}>{themeKeys.length} opciones</div>
        </div>

        <div
          role="listbox"
          aria-label="Selector de temas"
          tabIndex={-1}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 10
          }}
        >
          {themeKeys.map((key) => {
            const t = temas[key];
            const active = key === selected;
            return (
              <div
                key={key}
                role="option"
                tabIndex={0}
                aria-selected={active}
                onClick={() => handleSelect(key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(key); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 10,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: active ? `${t.primario}11` : '#fff',
                  border: active ? `2px solid ${t.acento}` : '1px solid rgba(16,24,40,0.06)',
                  boxShadow: active ? `0 10px 30px ${t.acento}22` : '0 8px 18px rgba(16,24,40,0.04)',
                  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease'
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.transform = 'translateY(-4px)'; ev.currentTarget.style.boxShadow = `0 14px 34px rgba(0,0,0,0.08)`; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = active ? `0 10px 28px ${t.acento}22` : '0 8px 18px rgba(16,24,40,0.04)'; }}
              >
                <div style={{ height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, ${t.fondo}, ${t.primario}, ${t.secundario})`
                  }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{t.nombre.replace('_', ' ')}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 4, background: t.primario, boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }} />
                    <div style={{ width: 12, height: 12, borderRadius: 4, background: t.secundario, boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }} />
                    <div style={{ width: 12, height: 12, borderRadius: 4, background: t.acento, boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
          <button
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(16,24,40,0.06)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CambioTema;
