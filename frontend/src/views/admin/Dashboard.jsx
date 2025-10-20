// src/views/admin/Dashboard.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import NavAdmin from '../../components/nav/NavAdmin';
import { temas } from '../../styles/temas';
import { getStoredUser as getStoredUserApi } from '../../services/api';
import { isAuthenticated, getStoredUser, getHomeRouteForUser } from '../../services/auth';

const THEME_KEY = 'app_theme_selected';

const AnimatedSparkline = ({ data = [], color = '#1976d2', height = 80 }) => {
  if (!data.length) return <div style={{ height }}>Sin datos</div>;
  const vals = data.map(v => Number(v) || 0);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const points = vals.map((v, i) => {
    const x = (i / Math.max(1, vals.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min || 1)) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="url(#g1)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: 400,
          animation: 'dash 1800ms ease forwards'
        }}
      />
      <style>{`
        @keyframes dash { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  );
};

const BarSeries = ({ data = [], color = '#ff9800', height = 72 }) => {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'end', height }}>
      {data.map((v, i) => {
        const h = (v / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'end' }}>
            <div
              style={{
                width: '100%',
                height: `${h}%`,
                background: color,
                borderRadius: 6,
                transform: 'translateY(12px)',
                animation: `barGrow 500ms ${i * 80}ms cubic-bezier(.2,.9,.2,1) forwards`,
                boxShadow: `${color}33 0 6px 16px -8px`
              }}
            />
          </div>
        );
      })}
      <style>{`
        @keyframes barGrow { from { transform: translateY(48px) scaleY(0.6); opacity: 0 } to { transform: translateY(0) scaleY(1); opacity: 1 } }
      `}</style>
    </div>
  );
};

const KPI = ({ title, value, trend, accent }) => (
  <div style={{
    background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 10px 30px rgba(16,24,40,0.04)', border: '1px solid rgba(0,0,0,0.04)'
  }}>
    <div style={{ fontSize: 12, color: '#666' }}>{title}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{value}</div>
      {trend && <div style={{ fontSize: 12, color: accent, fontWeight: 800 }}>{trend}</div>}
    </div>
  </div>
);

const Dashboard = () => {
  const [localThemeKey, setLocalThemeKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
  const tema = temas[localThemeKey] || temas.bosque_claro;

  const [allowed, setAllowed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const ensureLocalAdmin = useCallback(() => {
    try {
      // Primero, validar que la sesión esté activa
      if (!isAuthenticated()) {
        window.location.hash = '#/login';
        return false;
      }

      // Intentar obtener user desde auth.js (centralizado)
      const user = getStoredUser();
      // Fallback a la compatibilidad con getStoredUser de api si es necesario
      const userApi = getStoredUserApi();
      const localUser = user || userApi;

      const rolLocal = localUser?.rol ?? localUser?.role ?? localUser?.roleName ?? localUser?.role_type;
      const isAdminLocal = rolLocal && String(rolLocal).toLowerCase().includes('admin');

      if (!isAdminLocal && mountedRef.current) {
        // Si el usuario está autenticado pero no es admin, redirige a su home según rol
        const home = getHomeRouteForUser(localUser) || '#/login';
        window.location.hash = home;
        return false;
      }

      setAllowed(true);
      return true;
    } catch (err) {
      if (mountedRef.current) window.location.hash = '#/login';
      return false;
    }
  }, []);

  useEffect(() => { ensureLocalAdmin(); }, [ensureLocalAdmin]);

  // react to theme changes (another tab or CambioTema)
  useEffect(() => {
    const onStorage = (e) => { if (e.key === THEME_KEY) setLocalThemeKey(e.newValue || 'bosque_claro'); };
    window.addEventListener('storage', onStorage);
    const poll = setInterval(() => {
      try {
        const k = localStorage.getItem(THEME_KEY) || 'bosque_claro';
        if (k !== localThemeKey) setLocalThemeKey(k);
      } catch {}
    }, 300);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(poll); };
  }, [localThemeKey]);

  if (!allowed) return null;

  // mock data
  const ventas = [120, 180, 95, 220, 160, 200, 240, 180, 210, 230];
  const clientes = [6, 9, 4, 12, 7, 10, 11, 9, 8, 13];
  const inventario = [120, 90, 60, 40, 80, 70];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
      <NavAdmin />
      <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Panel administrativo</h1>
            <div style={{ color: '#666', marginTop: 6 }}>Resumen ejecutivo y herramientas de gestión</div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ textAlign: 'right', color: '#777', fontSize: 13 }}>
              <div style={{ fontWeight: 800 }}>Módulos</div>
              <div style={{ marginTop: 4 }}>CRUD's · Reportes · Base de Datos</div>
            </div>
          </div>
        </header>

        {/* KPI row */}
        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 220 }}>
            <KPI title="Ventas este mes" value="$3,420.00" trend="+8.2%" accent="#2e7d32" />
            <div style={{ marginTop: 10, background: '#fff', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: '#666' }}>Tendencia (últimos 10 días)</div>
              <div style={{ marginTop: 8 }}><AnimatedSparkline data={ventas} color={tema.primario} height={72} /></div>
            </div>
          </div>

          <div style={{ flex: '1 1 220px', minWidth: 220 }}>
            <KPI title="Usuarios activos" value="124" trend="+3.6%" accent="#1976d2" />
            <div style={{ marginTop: 10, background: '#fff', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: '#666' }}>Nuevos clientes (mes)</div>
              <div style={{ marginTop: 8 }}><AnimatedSparkline data={clientes} color="#1976d2" height={72} /></div>
            </div>
          </div>

          <div style={{ flex: '1 1 220px', minWidth: 220 }}>
            <KPI title="Valor inventario" value="$42,800" trend="-1.8%" accent="#f57c00" />
            <div style={{ marginTop: 10, background: '#fff', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: '#666' }}>Existencias por categoría</div>
              <div style={{ marginTop: 8 }}><BarSeries data={inventario} color={tema.acento} height={56} /></div>
            </div>
          </div>

          <div style={{ flex: '0 0 160px', minWidth: 140 }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, textAlign: 'center', boxShadow: '0 10px 28px rgba(16,24,40,0.04)' }}>
              <div style={{ fontSize: 12, color: '#888' }}>Salud del sistema</div>
              <div style={{ marginTop: 8, fontWeight: 900, fontSize: 18, color: tema.primario }}>86%</div>
            </div>
          </div>
        </section>

        {/* Detail: ventas and inventario */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 12px 30px rgba(16,24,40,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Ventas y facturación</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Series temporales, top productos y métricas de conversión</div>
                </div>
                <div style={{ color: '#888', fontSize: 13 }}>Últimos 10 días</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <AnimatedSparkline data={ventas} color={tema.primario} height={120} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, background: '#fafafa', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#888' }}>Top producto</div>
                  <div style={{ fontWeight: 900 }}>Cámara D-400</div>
                </div>

                <div style={{ width: 180, background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${tema.borde}` }}>
                  <div style={{ fontSize: 12, color: '#888' }}>Conversión</div>
                  <div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>3.8%</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Ticket promedio $84</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 900 }}>Inventario</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>Alertas de stock, rotación y valor por categoría</div>
              <div style={{ marginTop: 12 }}><BarSeries data={[120, 90, 60, 40, 80, 70]} color={tema.acento} height={84} /></div>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', padding: 14, borderRadius: 12 }}>
              <div style={{ fontWeight: 900 }}>Resumen rápido</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140, background: '#fafafa', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#888' }}>Ingresos mes</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>$24,600</div>
                </div>
                <div style={{ flex: 1, minWidth: 140, background: '#fafafa', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#888' }}>Órdenes</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>412</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', padding: 14, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontWeight: 900 }}>Alertas</div>
              <div style={{ marginTop: 10, color: '#d32f2f' }}>2 productos por debajo del stock mínimo</div>
            </div>
          </aside>
        </section>

        <footer style={{ marginTop: 'auto', color: '#666', fontSize: 13 }}>
          <div>Nota: los gráficos son ejemplos mock. Conecta tus APIs para datos reales y quita las animaciones si necesitas render estático para pruebas.</div>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
