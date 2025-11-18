import React, { useEffect, useRef, useState } from 'react';
import { temas } from '../styles/temas';

const STORAGE_KEY = 'app_theme_selected';

const CambioTema = ({ 
  value, 
  onChange, 
  align = 'left', 
  direction = 'up'
}) => {
  const themeKeys = Object.keys(temas);
  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || value || 'bosque_claro'; } 
    catch { return value || 'bosque_claro'; }
  });

  const rootRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, selected); } catch {}
    if (typeof onChange === 'function') onChange(selected);
  }, [selected, onChange]);

  useEffect(() => {
    if (value && value !== selected) setSelected(value);
  }, [value]);

  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // 📌 BOTÓN SIN CAMBIOS (38x38)
  const btnStyle = {
    display: 'inline-grid',
    placeItems: 'center',
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease'
  };

  // 📌 POPOVER MÁS PEQUEÑO PERO NO EL BOTÓN
  const popoverBaseStyle = {
    position: 'absolute',
    width: 200,
    background: '#ffffff',
    borderRadius: 10,
    padding: 8,
    boxShadow: '0 6px 24px rgba(16,24,40,0.12)',
    border: '1px solid rgba(16,24,40,0.08)',
    pointerEvents: open ? 'auto' : 'none',
    opacity: open ? 1 : 0,
    transition: 'all 0.15s ease',
    zIndex: 1000
  };

  // 📌 NUEVA LÓGICA DE POSICIÓN:
  // direction = "down" → se abre ABAJO y A LA IZQUIERDA
  const directionStyles = {
    up: {
      bottom: 'calc(100% + 6px)',
      left: 0,
      transform: open ? 'translateY(0)' : 'translateY(6px)'
    },
    down: {
      top: 'calc(100% + 6px)',
      right: 0, // se despliega a la izquierda del botón
      transform: open ? 'translateY(0)' : 'translateY(-6px)'
    }
  };

  const finalPopoverStyle = {
    ...popoverBaseStyle,
    ...directionStyles[direction]
  };

  const themeCardStyle = (active, t) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 6,
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? `${t.primario}18` : '#f2f2f2',
    border: active ? `2px solid ${t.primario}` : '1px solid #ddd',
    transition: 'all 0.15s ease'
  });

  const handleSelect = (key) => {
    setSelected(key);
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      
      {/* Botón */}
      <button
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title="Cambiar tema"
        style={{ 
          ...btnStyle,
          background: temas[selected].primario,
          color: '#fff'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C7 3 3 7 3 12s4 7 8 7c.9 0 1.7-.2 2.4-.5.8-.4 1.6.1 1.9.8.6 1.3 2.1 2.2 3.7 2.2 1.4 0 2.6-.6 3.5-1.6.7-.8.5-2.1-.5-2.7-1.6-1-2.8-2.6-3.1-4.5C19.3 7.5 15.9 4 12 3z"/>
        </svg>
      </button>

      {/* Popover */}
      <div
        ref={popRef}
        role="dialog"
        aria-hidden={!open}
        style={finalPopoverStyle}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6
        }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Temas</div>
          <div style={{ fontSize: 11, color: '#666' }}>{themeKeys.length}</div>
        </div>

        {/* Lista */}
        <div
          role="listbox"
          aria-label="Selector de temas"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: 6
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
                style={themeCardStyle(active, t)}
              >
                <div style={{ 
                  height: 24,
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(135deg, ${t.fondo}, ${t.primario})`
                  }} />
                </div>

                <div style={{
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ 
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                    {t.nombre.replace('_', ' ')}
                  </div>

                  <div style={{ display: 'flex', gap: 3 }}>
                    <div style={{
                      width: 8, height: 8,
                      borderRadius: 3,
                      background: t.primario
                    }} />
                    <div style={{
                      width: 8, height: 8,
                      borderRadius: 3,
                      background: t.secundario
                    }} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CambioTema;
