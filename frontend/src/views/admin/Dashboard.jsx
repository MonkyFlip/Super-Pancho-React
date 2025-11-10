// src/views/admin/Dashboard.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import NavAdmin from '../../components/nav/NavAdmin';
import { temas } from '../../styles/temas';
import { getStoredUser as getStoredUserApi } from '../../services/api';
import { isAuthenticated, getStoredUser, getHomeRouteForUser } from '../../services/auth';
import { useTranslation } from "react-i18next";


// Importar dashboards de submódulos dentro de admin
import DashboardU from './usuarios/DashboardU';
import DashboardC from './clientes/DashboardC';
import DashboardP from './productos/DashboardP.jsx';
import DashboardA from './areas/DashboardA';
import DashboardT from './trabajadores/DashboardT';

// Multimedia
import ImagenesView from './multimedia/ImagenesView';
import FotosView from './multimedia/FotosView';
import VideosView from './multimedia/VideosView';
// Reportes / Analisis
import AnalisisV from './reportes/AnalisisV';
import AnalisisView from './spark/AnalisisView';


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

// parseHash util
const parseHash = () => {
  const h = (window.location.hash || '#/').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  return parts; // ejemplo: ['admin','usuarios','DashboardU']
};

function Dashboard() {
  const { t } = useTranslation();
  const [localThemeKey, setLocalThemeKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
  const tema = temas[localThemeKey] || temas.bosque_claro;

  const [allowed, setAllowed] = useState(false);
  const mountedRef = useRef(true);

  // sub-route state
  const [route, setRoute] = useState(parseHash());

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const ensureLocalAdmin = useCallback(() => {
    try {
      if (!isAuthenticated()) {
        window.location.hash = '#/login';
        return false;
      }

      const user = getStoredUser();
      const userApi = getStoredUserApi();
      const localUser = user || userApi;

      const rolLocal = localUser?.rol ?? localUser?.role ?? localUser?.roleName ?? localUser?.role_type;
      const isAdminLocal = rolLocal && String(rolLocal).toLowerCase().includes('admin');

      if (!isAdminLocal && mountedRef.current) {
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

  // listen hash changes to handle sub-routing inside admin
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    // set initial
    setRoute(parseHash());
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!allowed) return null;

  // Decide sub-route: route[0] is 'admin'
  const [, second, third] = route;

  // CRUD dashboards
  if (second === 'usuarios' || third === 'DashboardU') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
        <NavAdmin />
        <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <DashboardU />
        </main>
      </div>
    );
  }

  if (second === 'clientes' || third === 'DashboardC') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
        <NavAdmin />
        <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <DashboardC />
        </main>
      </div>
    );
  }

  if (second === 'productos' || third === 'DashboardP') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
        <NavAdmin />
        <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <DashboardP />
        </main>
      </div>
    );
  }

  if (second === 'areas' || third === 'DashboardA') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
        <NavAdmin />
        <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <DashboardA />
        </main>
      </div>
    );
  }

  if (second === 'trabajadores' || third === 'DashboardT') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
        <NavAdmin />
        <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <DashboardT />
        </main>
      </div>
    );
  }

  // Multimedia routes
  if (second === 'multimedia') {
    let ViewComponent = null;
    if (third === 'imagenes') ViewComponent = ImagenesView;
    else if (third === 'fotos') ViewComponent = FotosView;
    else if (third === 'videos') ViewComponent = VideosView;

    if (ViewComponent) {
      return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
          <NavAdmin />
          <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <ViewComponent />
          </main>
        </div>
      );
    }
  }

  // Reportes / Analisis route
  if ((second === 'reportes' && third === 'analisis') || (second === 'reportes' && third === 'AnalisisV') || (second === 'reportes' && third === 'ReportesV' && window.location.hash.toLowerCase().includes('analisis')) ) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
        <NavAdmin />
        <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <AnalisisV />
        </main>
      </div>
    );
  }

  // --- Nueva Ruta: Análisis Spark ---
  if (second === 'spark' && (third === 'analisis' || third === 'AnalisisView')) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
        <NavAdmin />
        <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <AnalisisView />
        </main>
      </div>
    );
  }

  // Dashboard principal (default)
  const ventas = [120, 180, 95, 220, 160, 200, 240, 180, 210, 230];
  const clientes = [6, 9, 4, 12, 7, 10, 11, 9, 8, 13];
  const inventario = [120, 90, 60, 40, 80, 70];
  
   return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
        overflowX: "hidden",
      }}
    >
      <NavAdmin />

      <main
        style={{
          flex: 1,
          padding: 28,
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 20,
          minWidth: 0,
        }}
      >
        <section
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 18,
            boxShadow: "0 10px 30px rgba(16,24,40,0.04)",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>{t("dashboard.salesSummary")}</h2>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                {t("dashboard.last30days")}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <KPI
                title={t("dashboard.kpi.monthlySales")}
                value="$12,430"
                trend="+4.2%"
                accent="#16a34a"
              />
              <KPI
                title={t("dashboard.kpi.newClients")}
                value="86"
                trend="+3.1%"
                accent="#0ea5e9"
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <AnimatedSparkline data={ventas} color="#2563eb" />
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 13, color: "#666" }}>
                {t("dashboard.clientsActivity")}
              </div>
              <BarSeries data={clientes} color="#06b6d4" />
            </div>

            <div
              style={{
                background: "#fff",
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 13, color: "#666" }}>
                {t("dashboard.topProducts")}
              </div>
              <BarSeries data={inventario} color="#f97316" />
            </div>
          </div>
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 10px 30px rgba(16,24,40,0.04)",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 13, color: "#666" }}>
              {t("dashboard.alerts")}
            </div>
            <div style={{ marginTop: 8, color: "#475569" }}>
              {t("dashboard.noAlerts")}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 10px 30px rgba(16,24,40,0.04)",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 13, color: "#666" }}>
              {t("dashboard.tasks")}
            </div>
            <div style={{ marginTop: 8, color: "#475569" }}>
              {t("dashboard.pendingTasks")}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default Dashboard;
