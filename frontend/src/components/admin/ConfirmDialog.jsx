// ConfirmDialog.jsx
import React, { useEffect } from 'react';
import { temas } from '../../styles/temas';

const THEME_KEY = 'app_theme_selected';

/**
 * ConfirmDialog
 * Props:
 * - open (bool)
 * - title (string)
 * - message (string)
 * - onConfirm()
 * - onCancel()
 */
const ConfirmDialog = ({ open = false, title = 'Confirmar', message = '', onConfirm = () => {}, onCancel = () => {} }) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div role="alertdialog" aria-modal="true" style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(12,14,20,0.45)',
      zIndex: 3300,
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        borderRadius: 10,
        background: tema.fondo,
        border: `1px solid ${tema.borde}`,
        boxShadow: `0 20px 60px ${tema.acento}22`
      }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${tema.borde}` }}>
          <h4 style={{ margin: 0, color: tema.texto }}>{title}</h4>
        </div>
        <div style={{ padding: 16, color: tema.texto }}>
          <div style={{ marginBottom: 12 }}>{message}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onCancel} style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${tema.borde}`,
              background: tema.secundario,
              color: tema.texto
            }}>Cancelar</button>

            <button onClick={onConfirm} style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: tema.primario,
              color: '#fff'
            }}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
