// FormModal.jsx
import React, { useEffect } from 'react';
import { temas } from '../../styles/temas';

const THEME_KEY = 'app_theme_selected';

/**
 * FormModal
 * Props:
 * - open (bool)
 * - title (string)
 * - onClose()
 * - children (form contents)
 * - footer (optional custom footer)
 *
 * Simple modal controlado, accesible y con estilos que respetan el tema.
 */
const FormModal = ({ open = false, title = '', onClose = () => {}, children, footer }) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(12,14,20,0.45)',
      zIndex: 3200,
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 760,
        borderRadius: 12,
        background: tema.fondo,
        boxShadow: `0 20px 60px ${tema.acento}22`,
        border: `1px solid ${tema.borde}`,
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: `1px solid ${tema.borde}` }}>
          <div>
            <h3 style={{ margin: 0, color: tema.texto }}>{title}</h3>
          </div>
          <div>
            <button onClick={onClose} aria-label="Cerrar" style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: tema.borde,
              fontSize: 18,
              padding: 8
            }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {children}
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${tema.borde}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {footer ? footer : (
            <>
              <button onClick={onClose} style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${tema.borde}`,
                background: tema.secundario,
                color: tema.texto
              }}>Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormModal;
