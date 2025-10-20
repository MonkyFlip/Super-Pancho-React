// src/views/admin/bd/ExportarBD.jsx
import React, { useEffect, useState } from 'react';
import { temas } from '../../../styles/temas';
import { exportarBD, getExportHistory } from '../../../services/api';

const THEME_KEY = 'app_theme_selected';

/**
 * ExportarBD
 * - Botón para iniciar exportación (genera job en backend)
 * - Muestra historial de exportaciones con estado y enlace de descarga (si aplica)
 * - Respetuoso del tema guardado en localStorage
 */
const ExportarBD = () => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      setError('');
      const res = await getExportHistory();
      setHistory(res?.data?.data ?? res?.data ?? []);
    } catch (err) {
      console.error('getExportHistory error', err);
      setError('No se pudo obtener historial de exportaciones');
      setHistory([]);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError('');
      await exportarBD(); // backend inicia job y retorna info; aquí asumimos que la respuesta no bloquea
      await fetchHistory();
      alert('Exportación iniciada. Revisa el historial para ver el progreso.'); // reemplazar por toast si existe
    } catch (err) {
      console.error('exportarBD error', err);
      setError('No se pudo iniciar la exportación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: tema.texto }}>Exportar Base de Datos</h2>
          <div style={{ color: tema.borde, marginTop: 6 }}>Genera un respaldo descargable de la base de datos</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExport}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: tema.primario,
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Iniciando export...' : 'Exportar BD'}
          </button>

          <button
            onClick={fetchHistory}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${tema.borde}`,
              background: tema.secundario,
              color: tema.texto
            }}
          >
            Actualizar historial
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#a33', marginBottom: 12 }}>{error}</div>}

      <div style={{ borderRadius: 10, border: `1px solid ${tema.borde}`, background: tema.secundario, padding: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: tema.texto, marginBottom: 8 }}>Historial de exportaciones</div>

        {history.length === 0 ? (
          <div style={{ color: tema.borde }}>No hay exportaciones registradas.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 10, borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.fondo }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700, color: tema.texto }}>{h.filename ?? `export-${h.id}`}</div>
                  <div style={{ color: tema.borde, fontSize: 13 }}>{new Date(h.createdAt || h.fecha || h.timestamp).toLocaleString()}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ color: h.status === 'done' ? '#1f9d55' : h.status === 'failed' ? '#e23a3a' : tema.borde, fontWeight: 700 }}>
                    {h.status ?? 'pending'}
                  </div>

                  {h.status === 'done' && h.downloadUrl && (
                    <a
                      href={h.downloadUrl}
                      download
                      style={{ padding: '8px 10px', borderRadius: 8, background: tema.primario, color: '#fff', textDecoration: 'none', fontWeight: 700 }}
                    >
                      Descargar
                    </a>
                  )}

                  {h.status === 'failed' && (
                    <button onClick={() => alert(h.error || 'Error desconocido')} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }}>
                      Ver error
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportarBD;
