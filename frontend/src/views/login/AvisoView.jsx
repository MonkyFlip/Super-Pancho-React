import React, { useEffect, useState, useRef } from 'react';
import { temas } from '../../styles/temas';
import { crearBase, verificarBase } from '../../services/api';
import LoginView from '../login/LoginView';
import CambioTema from '../../components/CambioTema';

const AvisoView = () => {
  const [baseExiste, setBaseExiste] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState('Verificando base de datos...');
  const [error, setError] = useState(null);
  const [finalMessage, setFinalMessage] = useState(null);
  const [themeKey, setThemeKey] = useState(() => {
    try {
      return localStorage.getItem('app_theme_selected') || 'bosque_claro';
    } catch {
      return 'bosque_claro';
    }
  });

  const isMounted = useRef(true);
  const tema = temas[themeKey] || temas.bosque_claro;

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
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('app_theme_selected', themeKey);
    } catch {}
  }, [themeKey]);

  const colorForProgress = (p) => {
    if (p < 40) return '#e23a3a';
    if (p < 80) return '#f0a500';
    return '#2ea44f';
  };

  const simularProgreso = (stageDurations = [400, 800, 1200, 600]) => {
    const steps = [6, 18, 40, 70, 90, 100];
    const delays = [stageDurations[0], stageDurations[1], stageDurations[2], stageDurations[3], 600, 300];
    steps.forEach((s, idx) => {
      setTimeout(() => {
        if (!isMounted.current) return;
        setProgreso(s);
      }, delays.slice(0, idx + 1).reduce((a, b) => a + b, 0));
    });
  };

  const iniciarCrearYPoblar = async () => {
    setError(null);
    setFinalMessage(null);
    setProcesando(true);
    setEstado('Creando estructura y poblando (500k registros) — esto puede tardar varios minutos');
    setProgreso(6);
    simularProgreso();

    try {
      const res = await crearBase({});
      if (!isMounted.current) return;
      const resumen = res?.data?.resumen || res?.data || {};
      setProgreso(100);
      setEstado('Poblamiento completado');
      setFinalMessage(`Base creada y poblada correctamente. Inserciones estimadas: ${resumen.inserted_total ?? 'N/A'}`);
      setProcesando(false);
      setTimeout(() => { if (isMounted.current) setBaseExiste(true); }, 1200);
    } catch (err) {
      console.error('crearBase error', err);
      setError(err?.response?.data?.error || String(err));
      setEstado('Error al crear y poblar la base');
      setProgreso(0);
      setProcesando(false);
    }
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
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          padding: 26,
          borderRadius: 12,
          boxShadow: `0 10px 30px ${tema.acento}22`,
          border: `1px solid ${tema.borde}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: tema.texto }}>Base de datos no encontrada</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <CambioTema value={themeKey} onChange={setThemeKey} />
            </div>
          </div>

          <p style={{ color: '#555', marginTop: 8 }}>
            Al pulsar el botón se creará la estructura y se poblará automáticamente con 1,000,000 registros distribuidos equitativamente.
          </p>

          <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
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
              {procesando ? 'Creando y poblando…' : 'Crear y poblar base (1M)'}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 16,
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
              marginTop: 16,
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
        </div>

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
              <div style={{ fontSize: 12, color: '#888' }}>Progreso</div>
              <div style={{ fontWeight: 700, color: colorForProgress(progreso) }}>{progreso}%</div>
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
              width: `${progreso}%`,
              background: colorForProgress(progreso),
              transition: 'width 520ms ease, background 200ms ease'
            }} />
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
            {procesando ? 'Creando y poblando. Por favor no cierres la aplicación.' : 'Aún no se inició el proceso.'}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#889', lineHeight: 1.3 }}>
            Recomendación: el poblamiento con 1M registros puede tardar y consumir recursos. Si necesitas validar rápidamente, omite y usa un dataset más pequeño.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvisoView;
