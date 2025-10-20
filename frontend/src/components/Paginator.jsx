// Paginator.jsx
import React from 'react';
import { temas } from '../styles/temas';

const THEME_KEY = 'app_theme_selected';

/**
 * Paginator
 * Props:
 * - page (number, 1-based)
 * - perPage (number)
 * - total (number)
 * - onPageChange(newPage)
 *
 * Diseñado para perPage = 10 en los CRUDs; sin embargo acepta cualquier perPage.
 */
const Paginator = ({ page = 1, perPage = 10, total = 0, onPageChange }) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const infoText = () => {
    const start = total === 0 ? 0 : (page - 1) * perPage + 1;
    const end = Math.min(total, page * perPage);
    return `Mostrando ${start}–${end} de ${total}`;
  };

  const btnStyle = {
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    background: '#fff',
    color: tema.texto,
    cursor: 'pointer',
    minWidth: 44
  };

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      paddingBottom: 6
    }}>
      <div style={{ color: tema.borde, fontSize: 13 }}>{infoText()}</div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          aria-label="Primera página"
          disabled={!canPrev}
          onClick={() => onPageChange(1)}
          style={{ ...btnStyle, opacity: canPrev ? 1 : 0.45 }}
        >
          «
        </button>
        <button
          aria-label="Página anterior"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          style={{ ...btnStyle, opacity: canPrev ? 1 : 0.45 }}
        >
          ‹
        </button>

        <div style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: `1px solid ${tema.borde}`,
          background: tema.secundario,
          color: tema.texto,
          minWidth: 76,
          textAlign: 'center',
          fontWeight: 700
        }}>
          {page} / {totalPages}
        </div>

        <button
          aria-label="Página siguiente"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          style={{ ...btnStyle, opacity: canNext ? 1 : 0.45 }}
        >
          ›
        </button>
        <button
          aria-label="Última página"
          disabled={!canNext}
          onClick={() => onPageChange(totalPages)}
          style={{ ...btnStyle, opacity: canNext ? 1 : 0.45 }}
        >
          »
        </button>
      </div>
    </div>
  );
};

export default Paginator;
