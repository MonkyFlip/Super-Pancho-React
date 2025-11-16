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

// ==================== COMPONENTES MODULARES DEL DASHBOARD ====================

// 1. 📊 COMPONENTES DE KPIs
const KPI_Card = ({ title, value, subtitle, trend, trendValue, color = '#1976d2', icon }) => (
  <div style={{
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{value}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#94a3b8' }}>{subtitle}</div>}
      </div>
      {icon && <div style={{ fontSize: 20 }}>{icon}</div>}
    </div>
    {trend && (
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
      </div>
    )}
  </div>
);

// 2. ⚡ COMPONENTES DE GRÁFICOS
const LineChart = ({ data, forecastData, title, height = 200 }) => {
  const allData = [...data, ...(forecastData || [])];
  const max = Math.max(...allData);
  const min = Math.min(...allData);
  const range = max - min || 1;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{title}</div>
      
      <div
  style={{
    position: 'relative',
    height: height - 60,
    width: '100%',
    overflow: 'hidden',
    minWidth: 0,
    display: 'flex'
  }}
>
        
        <svg
    width="100%"
    height="100%"
    viewBox={`0 0 100 ${height - 60}`}
    preserveAspectRatio="none"
    style={{ display: 'block' }} // 👈 evita expansión extra del SVG
  >
          {/* Línea principal */}
          <polyline
            points={data.map((d, i) => 
              `${(i / (data.length - 1)) * 100},${((max - d) / range) * (height - 80)}`
            ).join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
          />
          
          {/* Línea de pronóstico (punteada) */}
          {forecastData && (
            <polyline
              points={forecastData.map((d, i) => 
                `${((i + data.length - 1) / (data.length + forecastData.length - 2)) * 100},${((max - d) / range) * (height - 80)}`
              ).join(' ')}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

const HorizontalBarChart = ({ data, title, height = 200 }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 12, color: '#64748b' }}>{item.label}</div>
          <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: `${item.percentage}%`,
              height: 20,
              background: '#3b82f6',
              borderRadius: 4,
              transition: 'width 0.5s ease'
            }} />
            <div style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PieChart = ({ data, title, height = 200 }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: item.color
          }} />
          <div style={{ flex: 1, fontSize: 12 }}>{item.label}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{item.percentage}%</div>
        </div>
      ))}
    </div>
  </div>
);

// 3. 🚀 COMPONENTES DE WIDGETS
const AlertWidget = ({ alerts, title = "Alertas de Inventario" }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          ✅ Todo en orden
        </div>
      ) : (
        alerts.map((alert, index) => (
          <a 
            key={index}
            href={`#/admin/productos`}
            style={{
              display: 'block',
              padding: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 12,
              color: '#dc2626',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#fecaca'}
            onMouseOut={(e) => e.target.style.background = '#fef2f2'}
          >
            ⚠️ {alert}
          </a>
        ))
      )}
    </div>
  </div>
);

const QuickActions = ({ actions }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Accesos Rápidos</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {actions.map((action, index) => (
        <a
          key={index}
          href={action.href}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#475569',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
          onMouseOut={(e) => e.target.style.background = '#f8fafc'}
        >
          {action.icon} {action.label}
        </a>
      ))}
    </div>
  </div>
);

const SparkInsight = ({ insight }) => (
  <div style={{ 
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 12,
    padding: 16,
    color: 'white'
  }}>
    <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>🔥 Insight de Spark</div>
    <div style={{ fontSize: 14, fontWeight: 600 }}>
      {insight || "💡 Los clientes que compran 'Producto A' los lunes tienen un 70% de probabilidad de comprar 'Producto B'."}
    </div>
  </div>
);

const MediaWidget = ({ media }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recursos Multimedia</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {media.map((item, index) => (
        <a
          key={index}
          href={item.href}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 8,
            fontSize: 12,
            color: '#475569',
            textDecoration: 'none'
          }}
        >
          {item.type === 'video' ? '🎬' : '🖼️'} {item.title}
        </a>
      ))}
    </div>
  </div>
);

const ActivityLog = ({ activities }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Actividad Reciente</div>
    <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {activities.map((activity, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ color: '#94a3b8', minWidth: 40 }}>{activity.time}</div>
          <div style={{ color: '#475569' }}>{activity.message}</div>
        </div>
      ))}
    </div>
  </div>
);

// ==================== DASHBOARD PRINCIPAL ====================

function Dashboard() {
  const { t } = useTranslation();
  const [localThemeKey, setLocalThemeKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
  const tema = temas[localThemeKey] || temas.bosque_claro;

  const [allowed, setAllowed] = useState(false);
  const mountedRef = useRef(true);

  const [route, setRoute] = useState(() => {
    const h = (window.location.hash || '#/').replace(/^#/, '');
    return h.split('/').filter(Boolean);
  });

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

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    setRoute(parseHash());
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Función auxiliar para parsear hash
  function parseHash() {
    const h = (window.location.hash || '#/').replace(/^#/, '');
    const parts = h.split('/').filter(Boolean);
    return parts;
  }

  if (!allowed) return null;

  const [, second, third] = route;

  // Manejo de rutas de submódulos (mantener tu lógica existente)
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

  // DATOS DE EJEMPLO PARA EL DASHBOARD
  const kpiData = {
    ventasHoy: { value: '$8,430', trend: 'up', trendValue: '+12%' },
    transacciones: { value: '42', trend: 'up', trendValue: '+5%' },
    ticketPromedio: { value: '$201', trend: 'up', trendValue: '+6%' },
    nuevosClientes: { value: '8', trend: 'up', trendValue: '+14%' },
    pronostico: { value: '$7,890', status: 'above' } // above o below
  };

  const ventas30Dias = [120, 180, 95, 220, 160, 200, 240, 180, 210, 230, 190, 220, 250, 280, 260, 240, 270, 290, 310, 280, 300, 320, 310, 290, 300, 320, 340, 360, 350, 330];
  const pronostico = [340, 350, 360, 370];

  const topProductos = [
    { label: 'Laptop Gamer', value: '$2,340', percentage: 100 },
    { label: 'Smartphone Pro', value: '$1,890', percentage: 80 },
    { label: 'Tablet Elite', value: '$1,230', percentage: 65 },
    { label: 'Monitor 4K', value: '$980', percentage: 52 },
    { label: 'Teclado Mecánico', value: '$760', percentage: 45 }
  ];

  const ventasPorArea = [
    { label: 'Electrónica', percentage: 45, color: '#3b82f6' },
    { label: 'Abarrotes', percentage: 25, color: '#ef4444' },
    { label: 'Hogar', percentage: 15, color: '#10b981' },
    { label: 'Ropa', percentage: 10, color: '#f59e0b' },
    { label: 'Otros', percentage: 5, color: '#8b5cf6' }
  ];

  const alertasInventario = [
    "Arroz - Quedan 5 unidades",
    "Leche - Quedan 8 unidades",
    "Aceite - Quedan 3 unidades"
  ];

  const accionesRapidas = [
    { icon: '➕', label: 'Agregar Producto', href: '#/admin/productos' },
    { icon: '👤', label: 'Crear Usuario', href: '#/admin/usuarios' },
    { icon: '📊', label: 'Ver Reporte de Ventas', href: '#/admin/reportes' },
    { icon: '🔥', label: 'Ver Análisis de Spark', href: '#/admin/spark/analisis' }
  ];


  const actividadReciente = [
    { time: '10:30', message: 'Admin agregó "Producto Nuevo"' },
    { time: '10:25', message: 'trabajador1 inició sesión' },
    { time: '10:15', message: 'Se generó el reporte "Ventas Mensuales"' },
    { time: '10:00', message: 'trabajador2 cerró la venta #5043' },
    { time: '09:45', message: 'Cliente nuevo registrado' }
  ];

  // DASHBOARD PRINCIPAL MODULAR
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
      overflowX: 'hidden',
    }}>
      <NavAdmin />
      
      <main style={{
        flex: 1,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        minWidth: 0
      }}>
        
        {/* 1. 📊 FILA SUPERIOR: KPIs */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}>
          <KPI_Card 
            title="Ventas de Hoy" 
            value={kpiData.ventasHoy.value}
            trend={kpiData.ventasHoy.trend}
            trendValue={kpiData.ventasHoy.trendValue}
            icon="💰"
          />
          <KPI_Card 
            title="Total de Transacciones" 
            value={kpiData.transacciones.value}
            trend={kpiData.transacciones.trend}
            trendValue={kpiData.transacciones.trendValue}
            icon="🧾"
          />
          <KPI_Card 
            title="Ticket Promedio" 
            value={kpiData.ticketPromedio.value}
            trend={kpiData.ticketPromedio.trend}
            trendValue={kpiData.ticketPromedio.trendValue}
            icon="📈"
          />
          <KPI_Card 
            title="Nuevos Clientes" 
            value={kpiData.nuevosClientes.value}
            trend={kpiData.nuevosClientes.trend}
            trendValue={kpiData.nuevosClientes.trendValue}
            icon="👥"
          />
          <KPI_Card 
            title="Pronóstico de Venta" 
            value={kpiData.pronostico.value}
            subtitle={kpiData.pronostico.status === 'above' ? 'Por encima de la predicción ✅' : 'Por debajo de la predicción ⚠️'}
            icon="🔮"
          />
        </section>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: 24,
          alignItems: 'start'
        }}>
          
          {/* 2. ⚡ COLUMNA PRINCIPAL: EL PULSO DEL NEGOCIO */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <LineChart 
              data={ventas30Dias}
              forecastData={pronostico}
              title="Ventas de los Últimos 30 Días"
              height={300}
            />
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20
            }}>
              <HorizontalBarChart 
                data={topProductos}
                title="Top 5 Productos Más Vendidos (Semana)"
                height={250}
              />
              <PieChart 
                data={ventasPorArea}
                title="Ventas por Área"
                height={250}
              />
            </div>
          </section>

          {/* 3. 🚀 COLUMNA SECUNDARIA: ACCIONES E INSIGHTS */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AlertWidget alerts={alertasInventario} />
            <QuickActions actions={accionesRapidas} />
            <SparkInsight />
          </aside>
        </div>

        {/* 4. 📋 PIE DE PÁGINA: FEEDS DE ACTIVIDAD */}
        <section>
          <ActivityLog activities={actividadReciente} />
        </section>

      </main>
    </div>
  );
}

export default Dashboard;