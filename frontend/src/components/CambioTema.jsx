import React, { useEffect, useRef, useState } from 'react';
import { temas } from '../styles/temas';

const STORAGE_KEY = 'app_theme_selected';

const CambioTema = ({ 
  value, 
  onChange, 
  align = 'left', 
  direction = 'up' // Cambiado de 'down' a 'up' por defecto
}) => {
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

  const btnStyle = {
    display: 'inline-grid',
    placeItems: 'center',
    width: 38, // Reducido para coincidir con iconButton
    height: 38, // Reducido para coincidir con iconButton
    borderRadius: '50%', // Cambiado a circular como iconButton
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
  };

  const handleSelect = (key) => {
    setSelected(key);
    setOpen(false);
  };

  // Estilos del popover corregidos
  const popoverBaseStyle = {
    position: 'absolute',
    [align]: 0,
    width: 280, // Reducido ligeramente
    background: '#ffffff',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 8px 32px rgba(16,24,40,0.12)',
    border: '1px solid rgba(16,24,40,0.08)',
    pointerEvents: open ? 'auto' : 'none',
    opacity: open ? 1 : 0,
    transition: 'all 0.2s ease',
    zIndex: 1000
  };

  const directionStyles = {
    up: {
      bottom: 'calc(100% + 8px)',
      transform: open ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
    },
    down: {
      top: 'calc(100% + 8px)',
      transform: open ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
    }
  };

  const finalPopoverStyle = {
    ...popoverBaseStyle,
    ...directionStyles[direction]
  };

  return (
    <div ref={rootRef} style={{ 
      position: 'relative', 
      display: 'inline-block',
    }}>
      <button
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title="Cambiar tema"
        style={{ 
          ...btnStyle, 
          background: temas[selected].primario, 
          color: '#fff',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C7 3 3 7 3 12s4 7 8 7c.9 0 1.7-.2 2.4-.5.8-.4 1.6.1 1.9.8.6 1.3 2.1 2.2 3.7 2.2 1.4 0 2.6-.6 3.5-1.6.7-.8.5-2.1-.5-2.7-1.6-1-2.8-2.6-3.1-4.5C19.3 7.5 15.9 4 12 3z"/>
        </svg>
      </button>

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
          marginBottom: 12 
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Temas</div>
          <div style={{ fontSize: 12, color: '#666' }}>{themeKeys.length} opciones</div>
        </div>

        <div
          role="listbox"
          aria-label="Selector de temas"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 8
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
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(key);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: active ? `${t.primario}15` : '#f8f9fa',
                  border: active ? `2px solid ${t.primario}` : '1px solid #e9ecef',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(ev) => { 
                  if (!active) {
                    ev.currentTarget.style.background = `${t.primario}08`;
                    ev.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(ev) => { 
                  if (!active) {
                    ev.currentTarget.style.background = '#f8f9fa';
                    ev.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div style={{ 
                  height: 32, 
                  borderRadius: 6, 
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
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: 4 
                }}>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: '#111',
                    textTransform: 'capitalize'
                  }}>
                    {t.nombre.replace('_', ' ')}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <div style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: 3, 
                      background: t.primario 
                    }} />
                    <div style={{ 
                      width: 10, 
                      height: 10, 
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