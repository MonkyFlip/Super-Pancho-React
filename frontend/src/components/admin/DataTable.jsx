// DataTable.jsx
import React from 'react';
import Paginator from '../Paginator';
import { temas } from '../../styles/temas';

const THEME_KEY = 'app_theme_selected';

/**
 * DataTable
 * Props:
 * - columns: [{ key, label, width?, render?(row) }]
 * - data: array de rows
 * - page, perPage, total
 * - onPageChange(page)
 * - loading (bool)
 * - onEdit(row), onView(row), onDelete(row)  (actions opcionales)
 *
 * Uso: componente genérico para listar entidades; la lógica de fetch/paginación queda en la vista.
 */
const DataTable = ({
  columns = [],
  data = [],
  page = 1,
  perPage = 10,
  total = 0,
  onPageChange = () => {},
  loading = false,
  onEdit,
  onView,
  onDelete
}) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    background: tema.fondo,
    color: tema.texto
  };

  const thStyle = {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 13,
    color: tema.borde,
    borderBottom: `1px solid ${tema.borde}`
  };

  const tdStyle = {
    padding: '10px 12px',
    fontSize: 14,
    borderBottom: `1px solid ${tema.borde}`,
    color: tema.texto
  };

  return (
    <div style={{ width: '100%', borderRadius: 10, overflow: 'hidden', border: `1px solid ${tema.borde}`, background: tema.secundario }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle} role="table" aria-busy={loading}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ ...thStyle, width: col.width || 'auto' }}>{col.label}</th>
              ))}
              {(onEdit || onView || onDelete) && <th style={{ ...thStyle, width: 120, textAlign: 'center' }}>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              // skeleton rows
              Array.from({ length: perPage }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map(col => (
                    <td key={col.key} style={tdStyle}>
                      <div style={{ height: 14, width: '70%', background: '#eee', borderRadius: 6 }} />
                    </td>
                  ))}
                  {(onEdit || onView || onDelete) && <td style={tdStyle}><div style={{ height: 28, width: 90, background: '#eee', borderRadius: 8, margin: '6px auto' }} /></td>}
                </tr>
              ))
            ) : (
              <>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + ((onEdit||onView||onDelete)?1:0)} style={{ ...tdStyle, textAlign: 'center', padding: 24, color: tema.borde }}>
                      No se encontraron registros.
                    </td>
                  </tr>
                ) : data.map((row, idx) => (
                  <tr key={row.id ?? idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'transparent' }}>
                    {columns.map(col => (
                      <td key={col.key} style={tdStyle}>
                        {col.render ? col.render(row) : (row[col.key] ?? '')}
                      </td>
                    ))}

                    {(onEdit || onView || onDelete) && (
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          {onView && (
                            <button onClick={() => onView(row)} style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: `1px solid ${tema.borde}`,
                              background: tema.fondo,
                              color: tema.texto,
                              cursor: 'pointer'
                            }}>Ver</button>
                          )}
                          {onEdit && (
                            <button onClick={() => onEdit(row)} style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: `1px solid ${tema.borde}`,
                              background: tema.primario,
                              color: '#fff',
                              cursor: 'pointer'
                            }}>Editar</button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(row)} style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: `1px solid ${tema.borde}`,
                              background: '#fff',
                              color: tema.texto,
                              cursor: 'pointer'
                            }}>Eliminar</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '10px 12px' }}>
        <Paginator page={page} perPage={perPage} total={total} onPageChange={onPageChange} />
      </div>
    </div>
  );
};

export default DataTable;
