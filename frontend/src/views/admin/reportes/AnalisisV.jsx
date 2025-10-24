// src/views/admin/reportes/AnalisisV.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scatter, Line, Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import Chart from 'chart.js/auto';
import { FaSyncAlt, FaPlay, FaChartLine } from 'react-icons/fa';
import { ventasRegresionSimple, ventasRegresionMultiple, getMe } from '../../../services/api';
import { getStoredUser, isAuthenticated, logout } from '../../../services/auth';

const DEFAULT_LIMIT = 1000;
const SESSION_PING_MS = 4 * 60 * 1000; // 4 minutos

const numberFmt = (v) => (Number.isFinite(v) ? Number(v).toFixed(2) : String(v));

const cardStyle = (theme) => ({
  background: theme?.bgCard || '#fff',
  border: `1px solid ${theme?.borde || '#e6eef9'}`,
  borderRadius: 10,
  padding: 12,
  boxShadow: '0 8px 20px rgba(16,24,40,0.04)'
});

const AnalisisV = ({ theme: injectedTheme } = {}) => {
  const theme = injectedTheme || {
    fondo: '#f6f8fa',
    secundario: '#eef2ff',
    primario: '#2563eb',
    borde: '#e6eef9',
    texto: '#0f1720',
    bgCard: '#fff'
  };

  const mountedRef = useRef(true);
  const keepAliveRef = useRef(null);

  const [mode, setMode] = useState('simple'); // simple | multiple
  const [xField, setXField] = useState('fecha_ordinal');
  const [yField, setYField] = useState('total');
  const [features, setFeatures] = useState(['precio', 'cantidad']);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [loading, setLoading] = useState(false);
  const [dataSimple, setDataSimple] = useState(null);
  const [dataMultiple, setDataMultiple] = useState(null);
  const [error, setError] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (keepAliveRef.current) clearInterval(keepAliveRef.current); };
  }, []);

  /**
   * Keep-alive / session validation
   * - Llama a /me periódicamente para validar token y refrescar estado.
   * - Si no está autenticado o /me falla con 401, se hace logout local.
   */
  const ensureSession = useCallback(async () => {
    try {
      if (!isAuthenticated()) {
        // no autenticado localmente -> forzar logout/redirect
        await logout({ redirect: true });
        return;
      }
      // si hay token, validar con backend
      await getMe(); // si falla con 401 el interceptor o caller manejará
    } catch (err) {
      // Si getMe falla, forzamos limpieza y redirección
      try { await logout({ redirect: true }); } catch (e) { /* noop */ }
    }
  }, []);

  useEffect(() => {
    // Ejecutar al montar y programar ping periódico
    ensureSession();
    keepAliveRef.current = setInterval(() => ensureSession(), SESSION_PING_MS);
    return () => { if (keepAliveRef.current) clearInterval(keepAliveRef.current); };
  }, [ensureSession]);

  const fetchSimple = useCallback(async (opts = {}) => {
    setError(null);
    setLoading(true);
    try {
      const body = opts.body || { collection: 'ventas', x_field: xField, y_field: yField, limit: limit };
      const res = await ventasRegresionSimple(body);
      if (mountedRef.current) setDataSimple(res.data ?? res);
    } catch (e) {
      if (mountedRef.current) setError(e?.response?.data ?? e.message ?? String(e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [xField, yField, limit]);

  const fetchMultiple = useCallback(async (opts = {}) => {
    setError(null);
    setLoading(true);
    try {
      const body = opts.body || { collection: 'ventas', features: features, target: yField, limit: limit };
      const res = await ventasRegresionMultiple(body);
      if (mountedRef.current) setDataMultiple(res.data ?? res);
    } catch (e) {
      if (mountedRef.current) setError(e?.response?.data ?? e.message ?? String(e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [features, yField, limit]);

  // initial load & when mode/params change
  useEffect(() => {
    if (mode === 'simple') fetchSimple();
    else fetchMultiple();
  }, [mode, fetchSimple, fetchMultiple]);

  // build datasets for simple regression
  const simpleChart = useMemo(() => {
    if (!dataSimple || !dataSimple.samples) return null;
    const xs = Array.isArray(dataSimple.samples.x) ? dataSimple.samples.x.map(Number) : [];
    const ys = Array.isArray(dataSimple.samples.y) ? dataSimple.samples.y.map(Number) : [];
    const ypred = Array.isArray(dataSimple.samples.y_pred) ? dataSimple.samples.y_pred.map(Number) : [];

    const points = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    const linePoints = xs.map((x, i) => ({ x, y: ypred[i] })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

    return {
      data: {
        datasets: [
          {
            label: 'Observado',
            data: points,
            backgroundColor: theme.primario,
            pointRadius: 4,
            showLine: false,
            type: 'scatter'
          },
          {
            label: 'Predicción',
            data: linePoints.sort((a,b)=>a.x-b.x),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.06)',
            fill: false,
            tension: 0.2,
            pointRadius: 0,
            type: 'line'
          }
        ]
      },
      meta: {
        n: dataSimple.n,
        intercept: dataSimple.intercept,
        coef: dataSimple.coef,
        r2: dataSimple.r2
      }
    };
  }, [dataSimple, theme.primario]);

  // build datasets for multiple regression
  const multipleCharts = useMemo(() => {
    if (!dataMultiple || !Array.isArray(dataMultiple.samples)) return null;
    const samples = dataMultiple.samples || [];
    const firstFeature = dataMultiple.features && dataMultiple.features.length ? dataMultiple.features[0] : Object.keys(samples[0]?.x || {})[0];
    const scatter = samples.map(s => ({ x: Number(s.x[firstFeature] ?? Object.values(s.x)[0]), y: Number(s.y) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    const pred = samples.map(s => ({ x: Number(s.x[firstFeature] ?? Object.values(s.x)[0]), y: Number(s.y_pred) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    const residuals = samples.map((s, i) => Math.abs(Number(s.y) - Number(s.y_pred)));

    return {
      scatter: {
        data: {
          datasets: [
            { label: 'Observado', data: scatter, pointRadius: 4, backgroundColor: theme.primario, type: 'scatter' },
            { label: 'Predicho', data: pred.sort((a,b)=>a.x-b.x), borderColor: '#ef4444', type: 'line', tension: 0.2, pointRadius: 0 }
          ]
        },
        meta: { feature: firstFeature }
      },
      residuals: {
        data: {
          labels: samples.map((_, i) => `#${i+1}`),
          datasets: [{ label: 'Residual (abs)', data: residuals, backgroundColor: 'rgba(99,102,241,0.9)' }]
        },
        meta: {}
      },
      summary: {
        n: dataMultiple.n,
        intercept: dataMultiple.intercept,
        coef: dataMultiple.coef,
        r2: dataMultiple.r2,
        features: dataMultiple.features
      }
    };
  }, [dataMultiple, theme.primario]);

  const commonOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: theme.texto } },
      tooltip: { mode: 'nearest', intersect: false }
    },
    scales: {
      x: { ticks: { color: theme.texto }, grid: { color: theme.borde } },
      y: { ticks: { color: theme.texto }, grid: { color: theme.borde } }
    }
  }), [theme.texto, theme.borde]);

  const onAnimate = useCallback(() => {
    setAnimate(true);
    setTimeout(() => setAnimate(false), 1200);
  }, []);

  return (
    <div style={{ padding: 18, minHeight: '100vh', background: `linear-gradient(180deg, ${theme.fondo}, ${theme.secundario})` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 14 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: theme.primario, color: '#fff', display: 'grid', placeItems: 'center' }}>
              <FaChartLine />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: theme.texto }}>Análisis de Ventas — Regresión</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>Simple y múltiple · Visualizaciones interactivas</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borde}` }}>
              <option value="simple">Regresión simple</option>
              <option value="multiple">Regresión múltiple</option>
            </select>

            {mode === 'simple' ? (
              <>
                <select value={xField} onChange={(e) => setXField(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borde}` }}>
                  <option value="fecha_ordinal">Fecha (ordinal)</option>
                  <option value="precio">Precio</option>
                  <option value="cantidad">Cantidad</option>
                </select>

                <select value={yField} onChange={(e) => setYField(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borde}` }}>
                  <option value="total">Total</option>
                  <option value="precio">Precio</option>
                </select>
              </>
            ) : (
              <>
                <input placeholder="features separadas por coma" value={features.join(',')} onChange={(e) => setFeatures(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borde}`, minWidth: 220 }} />
                <select value={yField} onChange={(e) => setYField(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borde}` }}>
                  <option value="total">Total</option>
                </select>
              </>
            )}

            <input type="number" value={limit} onChange={(e) => setLimit(Math.max(1, Number(e.target.value || DEFAULT_LIMIT)))} style={{ width: 100, padding: 8, borderRadius: 8, border: `1px solid ${theme.borde}` }} />
            <button onClick={() => { if (mode === 'simple') fetchSimple(); else fetchMultiple(); }} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: theme.primario, color: '#fff', cursor: 'pointer' }}>
              <FaSyncAlt /> {loading ? 'Cargando' : 'Actualizar'}
            </button>
          </div>
        </header>

        {error && <div style={{ color: '#b91c1c', ...cardStyle(theme) }}>{String(error)}</div>}

        <main style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 14 }}>
          <section style={cardStyle(theme)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: theme.texto }}>Gráfico principal</strong>
              <div style={{ color: '#64748b', fontSize: 13 }}>{mode === 'simple' ? 'Observado vs Predicho' : `Observado vs Predicho (${multipleCharts?.scatter?.meta?.feature || 'feature'})`}</div>
            </div>

            <div style={{ height: 420, marginTop: 10 }}>
              {mode === 'simple' ? (
                simpleChart ? <Scatter data={simpleChart.data} options={commonOptions} /> : <div style={{ color: '#64748b' }}>Sin datos</div>
              ) : (
                multipleCharts?.scatter ? <Scatter data={multipleCharts.scatter.data} options={commonOptions} /> : <div style={{ color: '#64748b' }}>Sin datos</div>
              )}
            </div>

            <div style={{ marginTop: 10, color: '#475569', fontSize: 13 }}>
              {mode === 'simple' && dataSimple && (
                <div>
                  n = <strong>{simpleChart?.meta?.n ?? dataSimple.n}</strong> · intercept = <strong>{numberFmt(simpleChart?.meta?.intercept ?? dataSimple.intercept)}</strong> · coef = <strong>{Array.isArray(simpleChart?.meta?.coef) ? simpleChart.meta.coef.map(numberFmt).join(', ') : numberFmt(simpleChart?.meta?.coef ?? dataSimple.coef)}</strong> · R² = <strong>{numberFmt(simpleChart?.meta?.r2 ?? dataSimple.r2 ?? 0)}</strong>
                </div>
              )}

              {mode === 'multiple' && dataMultiple && (
                <div>
                  n = <strong>{multipleCharts?.summary?.n ?? dataMultiple.n}</strong> · R² = <strong>{numberFmt(multipleCharts?.summary?.r2 ?? dataMultiple.r2 ?? 0)}</strong>
                </div>
              )}
            </div>
          </section>

          <aside style={cardStyle(theme)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: theme.texto }}>Detalles</strong>
              <div style={{ color: '#64748b', fontSize: 13 }}>{mode === 'simple' ? 'Muestras' : 'Resumen múltiple'}</div>
            </div>

            <div style={{ marginTop: 10, maxHeight: 420, overflow: 'auto' }}>
              {mode === 'simple' && dataSimple && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: theme.texto }}><th style={{ padding: 8 }}>x</th><th style={{ padding: 8 }}>y</th><th style={{ padding: 8 }}>y_pred</th></tr>
                  </thead>
                  <tbody>
                    {Array.isArray(dataSimple.samples?.x) ? dataSimple.samples.x.map((xi, i) => (
                      <tr key={i}>
                        <td style={{ padding: 8 }}>{xi}</td>
                        <td style={{ padding: 8 }}>{numberFmt(dataSimple.samples.y[i])}</td>
                        <td style={{ padding: 8 }}>{numberFmt(dataSimple.samples.y_pred[i])}</td>
                      </tr>
                    )) : <tr><td style={{ padding: 8 }}>Sin datos</td></tr>}
                  </tbody>
                </table>
              )}

              {mode === 'multiple' && dataMultiple && (
                <>
                  <div style={{ color: '#475569', marginBottom: 8 }}>Features: {multipleCharts?.summary?.features?.join(', ')}</div>
                  <div style={{ height: 220 }}>
                    {multipleCharts?.residuals ? <Bar data={multipleCharts.residuals.data} options={{ ...commonOptions, plugins: { legend: { display: false } } }} /> : <div style={{ color: '#64748b' }}>Sin datos</div>}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ textAlign: 'left', color: theme.texto }}><th style={{ padding: 8 }}>#</th><th style={{ padding: 8 }}>y</th><th style={{ padding: 8 }}>y_pred</th></tr></thead>
                      <tbody>
                        {Array.isArray(dataMultiple.samples) ? dataMultiple.samples.map((s, i) => (
                          <tr key={i}>
                            <td style={{ padding: 8 }}>{i + 1}</td>
                            <td style={{ padding: 8 }}>{numberFmt(s.y)}</td>
                            <td style={{ padding: 8 }}>{numberFmt(s.y_pred)}</td>
                          </tr>
                        )) : <tr><td style={{ padding: 8 }}>Sin datos</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!dataSimple && !dataMultiple && <div style={{ color: '#64748b' }}>Ejecuta la regresión para ver resultados</div>}
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onAnimate} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.borde}`, background: 'transparent' }}>
                <FaPlay /> Animar
              </button>
            </div>
          </aside>
        </main>

        <section style={cardStyle(theme)}>
          <strong style={{ color: theme.texto }}>Interpretación rápida</strong>
          <div style={{ marginTop: 8, color: '#475569' }}>
            {mode === 'simple' && dataSimple && (
              <div>
                Coeficiente: <strong>{Array.isArray(dataSimple.coef) ? dataSimple.coef.map(numberFmt).join(', ') : numberFmt(dataSimple.coef)}</strong>. Intercept: <strong>{numberFmt(dataSimple.intercept)}</strong>. R²: <strong>{numberFmt(dataSimple.r2 ?? 0)}</strong>.
              </div>
            )}

            {mode === 'multiple' && dataMultiple && (
              <div>
                Intercept: <strong>{numberFmt(dataMultiple.intercept)}</strong>.
                {dataMultiple.coef && Object.entries(dataMultiple.coef).map(([k,v]) => <span key={k} style={{ marginLeft: 8 }}>{k}: <strong>{numberFmt(v)}</strong></span>)}
                <div style={{ marginTop: 6 }}>R²: <strong>{numberFmt(dataMultiple.r2 ?? 0)}</strong>.</div>
              </div>
            )}

            {!dataSimple && !dataMultiple && <div>Actualiza para generar análisis.</div>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AnalisisV;
