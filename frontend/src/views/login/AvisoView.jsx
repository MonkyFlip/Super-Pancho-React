import React, { useEffect, useState, useRef } from 'react';
import { temas } from '../../styles/temas';
import { crearBase, verificarBase, getProgreso } from '../../services/api';
import LoginView from '../login/LoginView';
import CambioTema from '../../components/CambioTema';

const ProgressItem = ({ label, current, total, status, color }) => {
  const pct = total > 0 ? Math.min(100, Math.floor((current / total) * 100)) : 0;
  const barColor = status === 'error' ? '#e23a3a' : color;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, color: '#444', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#666' }}>
          {status === 'done' ? 'Completado' : status === 'error' ? 'Error' : `${pct}%`}
        </div>
      </div>
      <div style={{
        height: 14, background: '#f1f5f0', borderRadius: 10, overflow: 'hidden',
        border: '1px solid #d8e0d6'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          transition: 'width 400ms ease'
        }} />
      </div>
    </div>
  );
};

const AvisoView = () => {
  const [baseExiste, setBaseExiste] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [progresoTotal, setProgresoTotal] = useState(0);
  const [estado, setEstado] = useState('Verificando base de datos...');
  const [error, setError] = useState(null);
  const [finalMessage, setFinalMessage] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [themeKey, setThemeKey] = useState(() => {
    try {
      return localStorage.getItem('app_theme_selected') || 'bosque_claro';
    } catch {
      return 'bosque_claro';
    }
  });

  const isMounted = useRef(true);
  const pollingRef = useRef(null);
  const retryRef = useRef(0);
  const tema = temas[themeKey] || temas.bosque_claro;

  const [etapas, setEtapas] = useState({
    populate: { current: 0, total: 0, status: 'idle' },
    imagenes_color: { current: 0, total: 0, status: 'idle' },
    fotos_ruido: { current: 0, total: 0, status: 'idle' },
    videos: { current: 0, total: 0, status: 'idle' },
  });

  useEffect(() => {
    isMounted.current = true;
    const verificar = async () => {
      try {
        const res = await verificarBase();
        if (!isMounted.current) return;
        setBaseExiste(Boolean(res.data.ok));
      } catch {
        if (!isMounted.current) return;
        setBaseExiste(false);
      }
    };
    verificar();
    return () => {
      isMounted.current = false;
      limpiarPolling();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('app_theme_selected', themeKey);
    } catch {}
  }, [themeKey]);

  // Calcula progreso total con pesos
  useEffect(() => {
    const weights = {
      populate: 0.6,
      imagenes_color: 0.15,
      fotos_ruido: 0.15,
      videos: 0.10,
    };
    const calcPct = (cur, tot) => (tot > 0 ? cur / tot : 0);
    const totalPct =
      calcPct(etapas.populate.current, etapas.populate.total) * weights.populate +
      calcPct(etapas.imagenes_color.current, etapas.imagenes_color.total) * weights.imagenes_color +
      calcPct(etapas.fotos_ruido.current, etapas.fotos_ruido.total) * weights.fotos_ruido +
      calcPct(etapas.videos.current, etapas.videos.total) * weights.videos;

    setProgresoTotal(Math.min(100, Math.floor(totalPct * 100)));
  }, [etapas]);

  const limpiarPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const iniciarSeguimientoProgreso = () => {
    setEstado('Procesando… seguimiento de progreso activo');
    limpiarPolling();
    retryRef.current = 0;

    pollingRef.current = setInterval(async () => {
      if (!isMounted.current) return;
      try {
        const res = await getProgreso();
        const data = res?.data || {};
        const counts = data.counts || {};
        const current = data.current || {};
        const status = data.status || {};
        const message = data.message || null;

        setEtapas(prev => ({
          populate: {
            current: current.populate ?? prev.populate.current,
            total: counts.populate ?? prev.populate.total,
            status: status.populate ?? prev.populate.status,
          },
          imagenes_color: {
            current: current.imagenes_color ?? prev.imagenes_color.current,
            total: counts.imagenes_color ?? prev.imagenes_color.total,
            status: status.imagenes_color ?? prev.imagenes_color.status,
          },
          fotos_ruido: {
            current: current.fotos_ruido ?? prev.fotos_ruido.current,
            total: counts.fotos_ruido ?? prev.fotos_ruido.total,
            status: status.fotos_ruido ?? prev.fotos_ruido.status,
          },
          videos: {
            current: current.videos ?? prev.videos.current,
            total: counts.videos ?? prev.videos.total,
            status: status.videos ?? prev.videos.status,
          },
        }));

        if (message) setEstado(message);
        setLastUpdated(new Date().toLocaleTimeString());
        retryRef.current = 0;

        // Comprobación de finalización
        const allDone =
          ['populate', 'imagenes_color', 'fotos_ruido', 'videos'].every(k => {
            const cur = (current[k] ?? 0);
            const tot = (counts[k] ?? 0);
            const st = (status[k] ?? null);
            return st === 'done' || (tot > 0 && cur >= tot);
          });

        if (allDone) {
          limpiarPolling();
          setProcesando(false);
          setEstado('Proceso completado');
          setFinalMessage('Base creada, poblada y multimedia generada correctamente.');
          setTimeout(() => { if (isMounted.current) setBaseExiste(true); }, 1200);
        }
      } catch (err) {
        const statusCode = err?.response?.status;
        // Ignorar 404 temporales las primeras 6 veces (backend puede tardar en crear colecciones)
        if (statusCode === 404 && retryRef.current < 6) {
          retryRef.current += 1;
          return;
        }
        retryRef.current += 1;
        // Mostrar error solo si persiste
        if (retryRef.current > 8) {
          console.error('Error al recuperar progreso', err);
          setError('Error al recuperar progreso');
        }
      }
    }, 1000);
  };

  const iniciarCrearYPoblar = async () => {
    setError(null);
    setFinalMessage(null);
    setProcesando(true);
    setEstado('Iniciando proceso...');

    // Marcar estados iniciales
    setEtapas(prev => ({
      populate: { ...prev.populate, status: 'running' },
      imagenes_color: { ...prev.imagenes_color, status: 'queued' },
      fotos_ruido: { ...prev.fotos_ruido, status: 'queued' },
      videos: { ...prev.videos, status: 'queued' },
    }));

    try {
      // Llamada al endpoint que ahora inicia el job en background
      const res = await crearBase({ includeMedia: true });
      const statusCode = res?.status;
      const totals = res?.data?.totals || {};

      // Aplicar totales si vienen
      setEtapas(prev => ({
        populate: { ...prev.populate, total: totals.populate ?? prev.populate.total },
        imagenes_color: { ...prev.imagenes_color, total: totals.imagenes_color ?? prev.imagenes_color.total },
        fotos_ruido: { ...prev.fotos_ruido, total: totals.fotos_ruido ?? prev.fotos_ruudo?.total ?? prev.fotos_ruido.total },
        videos: { ...prev.videos, total: totals.videos ?? prev.videos.total },
      }));

      // Si el backend devolvió 202 (iniciado) o 409 (ya en ejecución), arrancamos polling
      if (statusCode === 202 || statusCode === 200 || statusCode === 409) {
        if (statusCode === 409) {
          setEstado('Proceso ya en ejecución. Recuperando progreso...');
        } else {
          setEstado('Proceso iniciado. Recuperando progreso...');
        }
        iniciarSeguimientoProgreso();
      } else {
        // En caso de respuesta inesperada, arrancamos igualmente el seguimiento
        iniciarSeguimientoProgreso();
      }
    } catch (err) {
      const statusCode = err?.response?.status;
      if (statusCode === 409) {
        // Ya en ejecución: arrancar polling
        setEstado('Proceso ya en ejecución. Recuperando progreso...');
        iniciarSeguimientoProgreso();
        return;
      }
      console.error('crearBase error', err);
      setError(err?.response?.data?.error || String(err));
      setEstado('Error al iniciar el proceso');
      setProcesando(false);
      limpiarPolling();
    }
  };

  const colorForProgress = (p) => {
    if (p < 40) return '#e23a3a';
    if (p < 80) return '#f0a500';
    return '#2ea44f';
  };

  if (baseExiste === null) {
    return (
      <div style={{
        backgroundColor: tema.fondo,
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        color: tema.texto
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Comprobando base de datos</div>
          <div style={{ color: tema.borde }}>Un momento, por favor...</div>
        </div>
      </div>
    );
  }

  if (baseExiste) {
    return <LoginView />;
  }

  return (
    <div style={{
      background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      color: tema.texto
    }}>
      <div style={{
        width: '100%',
        maxWidth: 960,
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: 20
      }}>
        {/* Recuadro izquierdo */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          padding: 22,
          borderRadius: 12,
          boxShadow: `0 10px 30px ${tema.acento}22`,
          border: `1px solid ${tema.borde}`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 280
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, color: tema.texto, fontSize: 20 }}>Base de datos no encontrada</h2>
          </div>

          <p style={{ color: '#555', marginTop: 10, marginBottom: 16 }}>
            Al pulsar el botón se creará la estructura y se poblará automáticamente con registros y multimedia
            (imágenes, fotos y videos) según la configuración.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={iniciarCrearYPoblar}
              disabled={procesando}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 10,
                border: 'none',
                background: procesando ? '#b6d8c8' : tema.primario,
                color: '#fff',
                cursor: procesando ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                boxShadow: procesando ? 'none' : `0 8px 20px ${tema.acento}33`
              }}
            >
              {procesando ? 'Creando y poblando…' : 'Crear y poblar base'}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 8,
              background: '#fff3f3',
              color: '#a33',
              border: '1px solid #f1c0c0'
            }}>
              <strong>Error:</strong> {String(error)}
            </div>
          )}

          {finalMessage && (
            <div style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 10,
              background: '#f3fff3',
              border: `1px solid ${tema.primario}33`,
              color: tema.acento
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{finalMessage}</div>
              <div>
                <button
                  onClick={() => setBaseExiste(true)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: tema.primario,
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  Ir al login
                </button>
              </div>
            </div>
          )}

          {/* Footer: cambio de tema en esquina inferior izquierda */}
          <div style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: 12, color: '#666' }}>Tema</span>
            <CambioTema value={themeKey} onChange={setThemeKey} />
          </div>
        </div>

        {/* Panel de progreso por etapas */}
        <div style={{
          background: 'linear-gradient(180deg,#ffffff,#fbfffb)',
          padding: 20,
          borderRadius: 12,
          boxShadow: `0 10px 30px ${tema.acento}22`,
          border: `1px solid ${tema.borde}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, color: '#444', fontWeight: 700 }}>Proceso</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{estado}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#888' }}>Progreso total</div>
              <div style={{ fontWeight: 700, color: colorForProgress(progresoTotal) }}>{progresoTotal}%</div>
            </div>
          </div>

          <div style={{
            marginTop: 14,
            height: 18,
            width: '100%',
            background: '#f1f5f0',
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${tema.borde}`
          }}>
            <div style={{
              height: '100%',
              width: `${progresoTotal}%`,
              background: colorForProgress(progresoTotal),
              transition: 'width 520ms ease, background 200ms ease'
            }} />
          </div>

          <ProgressItem
            label="Población de registros"
            current={etapas.populate.current}
            total={etapas.populate.total}
            status={etapas.populate.status}
            color="#2ea44f"
          />
          <ProgressItem
            label="Imágenes de color"
            current={etapas.imagenes_color.current}
            total={etapas.imagenes_color.total}
            status={etapas.imagenes_color.status}
            color="#0ea5e9"
          />
          <ProgressItem
            label="Fotos (ruido)"
            current={etapas.fotos_ruido.current}
            total={etapas.fotos_ruido.total}
            status={etapas.fotos_ruido.status}
            color="#7c3aed"
          />
          <ProgressItem
            label="Videos"
            current={etapas.videos.current}
            total={etapas.videos.total}
            status={etapas.videos.status}
            color="#f59e0b"
          />

          <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
            {procesando ? 'Procesando. Por favor no cierres la aplicación.' : 'Aún no se inició el proceso.'}
            {lastUpdated && <span style={{ marginLeft: 10, fontSize: 12, color: '#999' }}>Última: {lastUpdated}</span>}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#889', lineHeight: 1.3 }}>
            El poblamiento y generación de multimedia puede tardar y consumir recursos. Para validar rápido, usa un dataset menor.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvisoView;
