// src/views/admin/reportes/AnalisisV.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { temas } from '../../../styles/temas';
import { ventasRegresionSimple, ventasRegresionMultiple } from '../../../services/api';
import { FaSync, FaChartLine, FaLayerGroup, FaDownload, FaInfoCircle } from 'react-icons/fa';
import { isAuthenticated, getStoredUser, getHomeRouteForUser } from '../../../services/auth';
import { useTranslation, Trans } from "react-i18next";

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Scatter, Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

const THEME_KEY = 'app_theme_selected';

const formatForDisplay = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
};

const style = {
  container: { padding: 20 },
  card: (tema) => ({
    background: tema.fondo_card || tema.fondo || '#ffffff',
    padding: 14,
    borderRadius: 12,
    boxShadow: tema.sombra || '0 8px 24px rgba(8,15,30,0.06)',
    border: `1px solid ${tema.borde || '#eef2f7'}`
  }),
  headerRow: (tema) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }),
  title: (tema) => ({ fontSize: 18, fontWeight: 700, color: tema.texto }),
  btnPrimary: (tema) => ({
    padding: '8px 12px',
    borderRadius: 10,
    border: 'none',
    background: tema.primario || '#2563eb',
    color: '#fff',
    cursor: 'pointer'
  }),
  btnGhost: (tema) => ({
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${tema.borde}`,
    background: 'transparent',
    color: tema.texto,
    cursor: 'pointer'
  }),
  smallMuted: (tema) => ({ color: tema.subtexto || '#6b7280', fontSize: 13 })
};

export default function AnalisisV() {
  const { t } = useTranslation();
  const [temaKey, setTemaKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
  const tema = temas[temaKey] || temas.bosque_claro;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simpleResult, setSimpleResult] = useState(null);
  const [multipleResult, setMultipleResult] = useState(null);
  const [mode, setMode] = useState('simple'); // 'simple' | 'multiple'
  const mountedRef = useRef(false);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === THEME_KEY) setTemaKey(e.newValue || 'bosque_claro');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const ensureAuth = useCallback(() => {
    if (!isAuthenticated()) {
      window.location.hash = '#/login';
      return false;
    }
    const user = getStoredUser();
    if (!user) { window.location.hash = '#/login'; return false; }
    const rolLocal = user?.rol ?? user?.role ?? '';
    const isAdminLocal = String(rolLocal).toLowerCase().includes('admin');
    if (!isAdminLocal) {
      window.location.hash = getHomeRouteForUser(user) || '#/login';
      return false;
    }
    return true;
  }, []);

  const mapSimpleToSeries = useCallback((body) => {
    if (!body || !body.ok) return { points: [] };
    const xs = (body.samples && body.samples.x) || [];
    const ys = (body.samples && body.samples.y) || [];
    const y_pred = (body.samples && body.samples.y_pred) || [];
    const points = xs.map((x, i) => ({ x: Number(x) * 1000, y: Number(ys[i] ?? null), y_pred: Number(y_pred[i] ?? null) }));
    return { points };
  }, []);

  const mapMultipleRespToSeries = useCallback((body) => {
    if (!body || !body.ok) return { features: [], series: [], targetSeries: { data: [] }, predSeries: { data: [] }, coefs: {}, intercept: null, X_matrix: [], y: [], y_pred: [] };
    const features = body.features || [];
    const X = (body.samples && body.samples.X_matrix) || [];
    const y = (body.samples && body.samples.y) || [];
    const y_pred = (body.samples && body.samples.y_pred) || [];
    const coefs = body.coef || {};
    const intercept = body.intercept ?? null;
    const series = features.map((f, idx) => ({
      name: f,
      data: X.map((row, i) => ({ x: i, y: row[idx] != null ? Number(row[idx]) : null }))
    }));
    const targetSeries = { name: 'target', data: y.map((val, i) => ({ x: i, y: Number(val) })) };
    const predSeries = { name: 'y_pred', data: y_pred.map((val, i) => ({ x: i, y: Number(val) })) };
    return { features, series, targetSeries, predSeries, coefs, intercept, X_matrix: X, y, y_pred };
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const simplePayload = { collection: 'ventas', x_field: 'fecha_ordinal', y_field: 'total', limit: 1000 };
      const respSimple = await ventasRegresionSimple(simplePayload);
      const bodySimple = respSimple?.data ?? respSimple;
      setSimpleResult({ raw: bodySimple, mapped: mapSimpleToSeries(bodySimple) });

      const multiplePayload = { collection: 'ventas', features: ['items_count', 'sum_precio', 'avg_precio'], target: 'total', limit: 1000 };
      const respMult = await ventasRegresionMultiple(multiplePayload);
      const bodyMult = respMult?.data ?? respMult;
      setMultipleResult({ raw: bodyMult, mapped: mapMultipleRespToSeries(bodyMult) });

    } catch (err) {
      const server = err.serverData ?? err.response?.data ?? err.message ?? String(err);
      setError(server);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mapSimpleToSeries, mapMultipleRespToSeries]);

  useEffect(() => {
    if (!ensureAuth()) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    if (!ensureAuth()) return;
    fetchAll();
  }, [ensureAuth, fetchAll]);

  const downloadCSV = useCallback((rows, headers = []) => {
    if (!rows || !rows.length) return;
    const csvRows = [];
    if (headers.length) csvRows.push(headers.join(','));
    rows.forEach(r => {
      csvRows.push(Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = t('analisisV.download.regressionPrefix', 'regresion');
    a.download = `${prefix}_${mode}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [mode, t]);

  // --- Chart builders with white background and visible prediction line ---
  const buildSimpleChartData = useCallback(() => {
    const pts = simpleResult?.mapped?.points || [];
    return {
      datasets: [
        {
          label: t('analisisV.charts.observed', 'Observado'),
          data: pts.map(p => ({ x: p.x, y: p.y })),
          backgroundColor: 'rgba(30,64,175,0.95)',
          borderColor: 'rgba(30,64,175,0.95)',
          showLine: false,
          pointRadius: 3,
        },
        {
          label: t('analisisV.charts.prediction', 'Predicción'),
          data: pts.map(p => ({ x: p.x, y: p.y_pred })),
          borderColor: 'rgba(5,150,105,0.98)',
          backgroundColor: 'rgba(5,150,105,0.12)',
          pointRadius: 0,
          tension: 0.25,
          showLine: true,
          borderWidth: 3,
          fill: false,
        }
      ]
    };
  }, [simpleResult, t]);

  const simpleOptions = {
    parsing: false,
    plugins: {
      legend: { display: true, labels: { boxWidth: 12, usePointStyle: true, color: tema.texto } },
      tooltip: { mode: 'nearest', intersect: false }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'day' },
        title: { display: true, text: t('analisisV.charts.date', 'Fecha'), color: tema.texto },
        grid: { color: '#e6eef8' },
        ticks: { color: '#374151' }
      },
      y: {
        title: { display: true, text: t('analisisV.charts.totalSales', 'Ventas totales del turno (u)'), color: tema.texto },
        grid: { color: '#eef2f6' },
        ticks: { color: '#374151' }
      }
    },
    maintainAspectRatio: false,
    elements: { line: { tension: 0.25 } },
    layout: { padding: { top: 8, right: 12, bottom: 6, left: 6 } }
  };

  const buildMultipleChartData = useCallback(() => {
    const mapped = multipleResult?.mapped;
    if (!mapped) return { datasets: [] };
    const datasets = mapped.series.map((s, idx) => ({
      label: s.name,
      data: s.data,
      borderColor: `hsl(${(idx * 70) % 360} 65% 45%)`,
      backgroundColor: `hsla(${(idx * 70) % 360} 65% 45% / 0.06)`,
      showLine: true,
      tension: 0.12,
      pointRadius: 1,
      borderWidth: 1.5
    }));
    if (mapped.targetSeries?.data?.length) {
      datasets.push({
        label: t('analisisV.charts.target', 'Target'),
        data: mapped.targetSeries.data,
        borderColor: 'rgba(190,24,93,0.96)',
        backgroundColor: 'rgba(190,24,93,0.06)',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2
      });
    }
    if (mapped.predSeries?.data?.length) {
      datasets.push({
        label: t('analisisV.charts.prediction', 'Predicción'),
        data: mapped.predSeries.data,
        borderColor: 'rgba(14,165,233,0.95)',
        backgroundColor: 'rgba(14,165,233,0.06)',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 3
      });
    }
    return { datasets };
  }, [multipleResult, t]);

  const multipleOptions = {
    parsing: false,
    plugins: {
      legend: { display: true, labels: { boxWidth: 12, color: tema.texto } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { type: 'linear', title: { display: true, text: t('analisisV.charts.sampleIndex', 'Índice de muestra'), color: tema.texto }, grid: { color: '#eef2f6' }, ticks: { color: '#374151' } },
      y: { title: { display: true, text: t('analisisV.charts.value', 'Valor'), color: tema.texto }, grid: { color: '#eef2f6' }, ticks: { color: '#374151' } }
    },
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 12, bottom: 6, left: 6 } }
  };

  // --- Human readable interpretations ---
  const interpretSimple = useCallback((raw) => {
    if (!raw || !raw.ok) return t('analisisV.interpret.noInfo', 'No hay información para interpretar.');
    const pts = (raw.samples && raw.samples.x && raw.samples.y) ? raw.samples.x.map((x,i) => ({ x, y: raw.samples.y[i] })) : [];
    if (pts.length < 2) return t('analisisV.interpret.notEnoughPoints', 'No hay suficientes puntos para una interpretación confiable.');
    // slope approximation using simple linear regression (same as backend but quick local)
    try {
      const xs = pts.map(p => Number(p.x));
      const ys = pts.map(p => Number(p.y));
      const n = xs.length;
      const meanX = xs.reduce((a,b)=>a+b,0)/n;
      const meanY = ys.reduce((a,b)=>a+b,0)/n;
      const num = xs.reduce((acc, xv, i) => acc + (xv-meanX)*(ys[i]-meanY), 0);
      const den = xs.reduce((acc, xv) => acc + (xv-meanX)**2, 0) || 1;
      const slope = num/den;
      const slopePerDay = slope * 86400; // because xs are epoch seconds
      const direction = slopePerDay > 0 
        ? t('analisisV.interpret.increase', 'aumento') 
        : (slopePerDay < 0 ? t('analisisV.interpret.decrease', 'descenso') : t('analisisV.interpret.stable', 'estable'));
      // compute avg and recent trend
      const avg = ys.reduce((a,b)=>a+b,0)/n;
      const lastY = ys[ys.length-1];
      const pct = ((lastY - avg)/avg)*100;
      const trendText = t('analisisV.interpret.simpleSummary',
       'Tendencia: {{direction}}. Cambio aproximado por día: {{slope}} unidades. Último valor {{lastY}}, promedio {{avg}} ({{pct}}% respecto al promedio).',
       {
         direction: direction,
         slope: Math.abs(slopePerDay).toFixed(2),
         lastY: lastY.toFixed(2),
         avg: avg.toFixed(2),
         pct: pct.toFixed(1)
       }
     );
     return trendText
    } catch (e) {
      return t('analisisV.interpret.calcError', 'No se pudo calcular la interpretación estadística.');
    }
  }, [t]);

  const interpretMultiple = useCallback((raw) => {
    
    if (!raw || !raw.ok) return t('analisisV.interpret.noInfo', 'No hay información para interpretar.');
    const coefs = raw.coef || {};
    const n = raw.n || (raw.samples && raw.samples.y && raw.samples.y.length) || 0;
    if (!coefs || Object.keys(coefs).length === 0) return t('analisisV.interpret.noCoefficients', 'No se detectaron coeficientes para interpretar.');
    // identify top positive and negative contributors
    const entries = Object.entries(coefs).map(([k,v]) => ({ k, v: Number(v) || 0 }));
    entries.sort((a,b) => Math.abs(b.v) - Math.abs(a.v)); // por magnitud
    const top = entries.slice(0,3);
    const readable = top.map(item => {
      const sign = t.v > 0 ? t('analisisV.interpret.increases', 'aumenta') : (t.v < 0 ? t('analisisV.interpret.decreases', 'reduce') : t('analisisV.interpret.noEffect', 'sin efecto claro'));
      return `${t.k}: ${Math.abs(t.v).toFixed(3)} (${sign} el target por unidad de feature)`;
    }).join('; ');
    const base = t('analisisV.interpret.samplesUsed', 'Muestras usadas: {{n}}. ', { n });
    const advice = t('analisisV.interpret.coefficientAdvice', 'Interpretación: coeficientes positivos indican asociación directa con el total; coeficientes negativos indican asociación inversa. Los valores grandes en magnitud tienen mayor impacto.');
    return base + readable + ". " + advice;
  }, [t]);

  const SimpleSummaryCard = () => (
    <div style={style.card(tema)}>
      <div style={style.headerRow(tema)}>
        <div>
          <div style={style.title(tema)}>{t('analisisV.simple.title', 'Regresión simple')}</div>
          <div style={style.smallMuted(tema)}>{t('analisisV.simple.subtitle', 'Relaciona fecha (x) con total (y)')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => { setMode('simple'); }} 
            style={style.btnGhost(tema)} 
            title={t('analisisV.simple.viewTooltip', 'Ver simple')}
          >
            <FaChartLine />
          </button>
          <button 
            onClick={() => downloadCSV((simpleResult?.mapped?.points || []).map(p => ({ x: p.x, y: p.y, y_pred: p.y_pred })), ['x','y','y_pred'])} 
            style={style.btnGhost(tema)} 
            title={t('analisisV.download.tooltip', 'Exportar CSV')}
          >
            <FaDownload />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading && <div style={style.smallMuted(tema)}>{t('analisisV.loading', 'Cargando datos...')}</div>}
        {!loading && simpleResult && simpleResult.mapped && (
          <>
            <div style={{ height: 360, background: '#ffffff', borderRadius: 8, padding: 8 }}>
              <Scatter data={buildSimpleChartData()} options={simpleOptions} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <strong>{t('analisisV.simple.points', 'Puntos')}:</strong> {simpleResult.mapped.points.length}
              </div>
              <div style={{ flex: 1 }}>
                <strong>{t('analisisV.simple.model', 'Modelo')}:</strong> {simpleResult.raw?.mode ?? 'collection'}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{t('analisisV.interpret.title', 'Resumen en lenguaje sencillo')}</div>
              <div style={{ marginTop: 6, ...style.smallMuted(tema) }}>
                {interpretSimple(simpleResult.raw)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const MultipleSummaryCard = () => (
    
    <div style={style.card(tema)}>
      <div style={style.headerRow(tema)}>
        <div>
          <div style={style.title(tema)}>{t('analisisV.multiple.title', 'Regresión múltiple')}</div>
          <div style={style.smallMuted(tema)}>{t('analisisV.multiple.subtitle', 'Compara features con el target para estimar impacto')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => { setMode('multiple'); }} 
            style={style.btnGhost(tema)} 
            title={t('analisisV.multiple.viewTooltip', 'Ver multiple')}
          >
            <FaLayerGroup />
          </button>
          <button 
            onClick={() => {
              const X = multipleResult?.mapped?.X_matrix || [];
              const features = multipleResult?.mapped?.features || [];
              const rows = X.map((r, i) => {
                const obj = { index: i, y: (multipleResult?.mapped?.y || [])[i] };
                features.forEach((f, idx) => obj[f] = r[idx]);
                return obj;
              });
              downloadCSV(rows, ['index', ...(multipleResult?.mapped?.features || []), 'y']);
            }} 
            style={style.btnGhost(tema)} 
            title={t('analisisV.download.tooltip', 'Exportar CSV')}
          >
            <FaDownload />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading && <div style={style.smallMuted(tema)}>{t('analisisV.loading', 'Cargando datos...')}</div>}
        {!loading && multipleResult && multipleResult.mapped && (
          <>
            <div style={{ height: 320, background: '#ffffff', borderRadius: 8, padding: 8 }}>
              <Line data={buildMultipleChartData()} options={multipleOptions} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>{t('analisisV.multiple.features', 'Features')}</div>
                <div style={style.smallMuted(tema)}>{formatForDisplay(multipleResult.mapped.features)}</div>
              </div>

              <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>{t('analisisV.multiple.usefulRows', 'Filas útiles')}</div>
                <div style={style.smallMuted(tema)}>{multipleResult.raw?.n ?? (multipleResult.mapped?.X_matrix?.length ?? 0)}</div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{t('analisisV.multiple.intercept', 'Intercept')}</div>
                <div style={style.smallMuted(tema)}>{String(multipleResult.raw?.intercept ?? multipleResult.mapped.intercept ?? '-')}</div>
              </div>
              <div style={{ flex: 2 }}>
                <div style={{ fontWeight: 700 }}>{t('analisisV.multiple.coefficients', 'Coeficientes (resumen)')}</div>
                <pre style={{ marginTop: 6, maxHeight: 120, overflow: 'auto', background: '#fafafa', padding: 8, borderRadius: 8 }}>{formatForDisplay(multipleResult.raw?.coef ?? multipleResult.mapped.coefs ?? {})}</pre>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{t('analisisV.interpret.title', 'Resumen en lenguaje sencillo')}</div>
              <div style={{ marginTop: 6, ...style.smallMuted(tema) }}>
                {interpretMultiple(multipleResult.raw)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={style.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={style.title(tema)}>{t('analisisV.header.title', 'Panel de Análisis — Regresión')}</div>
          <div style={style.smallMuted(tema)}>{t('analisisV.header.subtitle', 'Comparativa de modelos y visualización interactiva')}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setMode('simple')} style={{ ...(mode === 'simple' ? style.btnPrimary(tema) : style.btnGhost(tema)) }}>
              {t('analisisV.modes.simple', 'Simple')}
            </button>
            <button onClick={() => setMode('multiple')} style={{ ...(mode === 'multiple' ? style.btnPrimary(tema) : style.btnGhost(tema)) }}>
              {t('analisisV.modes.multiple', 'Multiple')}
            </button>
          </div>
          <button 
            onClick={handleRefresh} 
            style={style.btnGhost(tema)} 
            title={t('analisisV.header.refreshTooltip', 'Actualizar')}
          >
            <FaSync /> {t('analisisV.header.refresh', 'Actualizar')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div>
          {/* Descripción clara para el usuario */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaInfoCircle style={{ color: '#2563eb' }} />
              <div style={{ fontWeight: 700 }}>{t('analisisV.info.title', 'Qué estás viendo')}</div>
            </div>
            <div style={{ marginTop: 8, ...style.smallMuted(tema) }}>
              <div><strong>{t('analisisV.info.simple.title', 'Regresión simple:')}</strong> {t('analisisV.info.simple.description', 'punto azul = ventas reales; línea verde = predicción del modelo. Si la línea sube con el tiempo, significa que las ventas tienden a aumentar; si baja, disminuyen.')}</div>
              <div style={{ height: 6 }} />
              <div><strong>{t('analisisV.info.multiple.title', 'Regresión múltiple:')}</strong> {t('analisisV.info.multiple.description', 'cada línea muestra cómo varía una característica (por ejemplo número de productos, suma de precios) a través de las muestras. La línea "Target" indica el valor real; la línea "Predicción" muestra lo que el modelo estima combinando las features.')}</div>
              <div style={{ height: 6 }} />
              <div><strong>{t('analisisV.info.interpretation.title', 'Interpretación sencilla:')}</strong> {t('analisisV.info.interpretation.description', 'lee el resumen en lenguaje natural abajo de cada gráfico; te dice la tendencia y las features con mayor efecto en el total.')}</div>
            </div>
          </div>

          {mode === 'simple' ? <SimpleSummaryCard /> : <MultipleSummaryCard />}
        </div>

        <div>
          <div style={style.card(tema)}>
            <div style={{ fontWeight: 700 }}>{t('analisisV.quickSummary.title', 'Resumen rápido')}</div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={style.smallMuted(tema)}>{t('analisisV.quickSummary.status', 'Estado')}</div>
                <div>{loading ? t('analisisV.quickSummary.loading', 'Cargando...') : t('analisisV.quickSummary.ready', 'Listo')}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <div style={style.smallMuted(tema)}>{t('analisisV.quickSummary.lastQuery', 'Última consulta')}</div>
                <div>{new Date().toLocaleString()}</div>
              </div>

              <hr style={{ border: 'none', height: 1, background: tema.borde, margin: '12px 0' }} />

              <div style={{ fontWeight: 700 }}>{t('analisisV.technicalDetails.title', 'Detalles técnicos')}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div><strong>{t('analisisV.technicalDetails.simple', 'Simple:')}</strong> {simpleResult ? `${simpleResult.mapped.points.length} ${t('analisisV.technicalDetails.points', 'puntos')}` : '—'}</div>
                <div><strong>{t('analisisV.technicalDetails.multiple', 'Multiple:')}</strong> {multipleResult ? `${multipleResult.raw?.n ?? (multipleResult.mapped?.X_matrix?.length ?? 0)} ${t('analisisV.technicalDetails.rows', 'filas')}` : '—'}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <details>
                  <summary style={{ cursor: 'pointer', color: tema.texto }}>{t('analisisV.rawData.title', 'Ver respuestas crudas')}</summary>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>{t('analisisV.rawData.simple', 'Simple (raw)')}</div>
                    <pre style={{ maxHeight: 140, overflow: 'auto', background: '#fafafa', padding: 8 }}>{formatForDisplay(simpleResult?.raw)}</pre>
                    <div style={{ fontWeight: 700 }}>{t('analisisV.rawData.multiple', 'Multiple (raw)')}</div>
                    <pre style={{ maxHeight: 140, overflow: 'auto', background: '#fafafa', padding: 8 }}>{formatForDisplay(multipleResult?.raw)}</pre>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...style.card(tema), borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontWeight: 700, color: '#b91c1c' }}>{t('analisisV.error.title', 'Error')}</div>
            <pre style={{ marginTop: 8 }}>{formatForDisplay(error)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}