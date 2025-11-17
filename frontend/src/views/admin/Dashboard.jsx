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

// Servicios API
import api from '../../services/api'; 

// widgets
import AlertasInventarioWidget from '../../components/widgets/AlertasInventarioWidget';
import ProductosMasVendidosWidget from '../../components/widgets/ProductosMasVendidosWidget';
import VentasPorAreaWidget from '../../components/widgets/VentasPorAreaWidget';
import Ventas30DiasWidget from '../../components/widgets/Ventas30DiasWidget';

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

// 2. ⚡ COMPONENTES DE GRÁFICOS (Helpers simples si se necesitan, o usar widgets)
const LineChart = ({ data, forecastData, title, height = 200 }) => {
  return <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>{title}</div>;
};

// 📈 Hook para KPIs Reales (Consumiendo el endpoint optimizado del backend)
const useKPIsData = () => {
  const { t } = useTranslation();
  const [kpis, setKpis] = useState({
    ventasHoy: { value: '$0.00', trend: 'stable', trendValue: t('dashboardT.kpi.today') },
    transacciones: { value: '0', trend: 'stable', trendValue: t('dashboardT.kpi.today') },
    ticketPromedio: { value: '$0.00', trend: 'stable', trendValue: t('dashboardT.kpi.average') },
    nuevosClientes: { value: '0', trend: 'stable', trendValue: t('dashboardT.kpi.today') },
    totalProductos: { value: '0', trend: 'stable', trendValue: t('dashboardT.kpi.inventory') }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const response = await api.get('/dashboard/resumen').catch(async (err) => {
            return await api.get('/api/dashboard/resumen'); 
        });

        if (response.data && response.data.success) {
           const data = response.data.data;
           setKpis({
            ventasHoy: { 
              value: `$${(data.ventasHoy || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 
              trend: data.ventasHoy > 0 ? 'up' : 'stable', 
              trendValue: t('dashboardT.kpi.today')
            },
            transacciones: { 
              value: (data.transacciones || 0).toString(), 
              trend: 'up', 
              trendValue: t('dashboardT.kpi.transactions')
            },
            ticketPromedio: { 
              value: `$${(data.ticketPromedio || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`, 
              trend: 'stable', 
              trendValue: t('dashboardT.kpi.average')
            },
            nuevosClientes: { 
              value: (data.nuevosClientes || 0).toString(), 
              trend: 'up', 
              trendValue: t('dashboardT.kpi.registeredToday')
            },
            totalProductos: {
              value: (data.totalProductos || 0).toString(),
              trend: 'stable',
              trendValue: t('dashboardT.kpi.inventory')
            }
           });
        }
      } catch (error) {
        console.error('Error cargando KPIs del servidor:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [t]);

  return { kpis, loading };
};

const QuickActions = ({ actions }) => {
  const { t } = useTranslation();
  
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t('dashboardT.quickActions.title')}</div>
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
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
          >
            {action.icon} {action.label}
          </a>
        ))}
      </div>
    </div>
  );
};

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

  // Usar KPIs dinámicos reales
  const { kpis: kpiData, loading: kpisLoading } = useKPIsData();

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

  // Manejo de rutas de submódulos
  const renderSubModule = (Component) => (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`, overflowX: 'hidden' }}>
      <NavAdmin />
      <main style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        <Component />
      </main>
    </div>
  );

  if (second === 'usuarios' || third === 'DashboardU') return renderSubModule(DashboardU);
  if (second === 'clientes' || third === 'DashboardC') return renderSubModule(DashboardC);
  if (second === 'productos' || third === 'DashboardP') return renderSubModule(DashboardP);
  if (second === 'areas' || third === 'DashboardA') return renderSubModule(DashboardA);
  if (second === 'trabajadores' || third === 'DashboardT') return renderSubModule(DashboardT);

  // Multimedia routes
  if (second === 'multimedia') {
    if (third === 'imagenes') return renderSubModule(ImagenesView);
    if (third === 'fotos') return renderSubModule(FotosView);
    if (third === 'videos') return renderSubModule(VideosView);
  }

  // Reportes / Analisis route
  if ((second === 'reportes' && third === 'analisis') || (second === 'reportes' && third === 'AnalisisV') || (second === 'reportes' && third === 'ReportesV' && window.location.hash.toLowerCase().includes('analisis')) ) {
    return renderSubModule(AnalisisV);
  }

  // --- Nueva Ruta: Análisis Spark ---
  if (second === 'spark' && (third === 'analisis' || third === 'AnalisisView')) {
    return renderSubModule(AnalisisView);
  }

  const accionesRapidas = [ 
    { icon: '👤', label: t('cruds.users'), href: '#/admin/usuarios' },
    { icon: '📊', label: t('reports.analysis'), href: '#/admin/reportes/AnalisisV' },
    { icon: '🔥', label: t('dashboardT.sparkAnalysis'), href: '#/admin/spark/analisis' },
    { icon: '📦', label: t('dashboardT.manageInventory'), href: '#/admin/productos' }
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
        
        {/* 1. 📊 FILA SUPERIOR: KPIs REALES */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}>
          <KPI_Card 
            title={t('dashboardT.kpi.salesToday')} 
            value={kpiData.ventasHoy.value}
            trend={kpiData.ventasHoy.trend}
            trendValue={kpiData.ventasHoy.trendValue}
            icon="💰"
          />
          <KPI_Card 
            title={t('dashboardT.kpi.totalTransactions')} 
            value={kpiData.transacciones.value}
            trend={kpiData.transacciones.trend}
            trendValue={kpiData.transacciones.trendValue}
            icon="🧾"
          />
          <KPI_Card 
            title={t('dashboardT.kpi.averageTicket')} 
            value={kpiData.ticketPromedio.value}
            trend={kpiData.ticketPromedio.trend}
            trendValue={kpiData.ticketPromedio.trendValue}
            icon="📈"
          />
          <KPI_Card 
            title={t('dashboardT.kpi.newClients')} 
            value={kpiData.nuevosClientes.value}
            trend={kpiData.nuevosClientes.trend}
            trendValue={kpiData.nuevosClientes.trendValue}
            icon="👥"
          />
          <KPI_Card 
            title={t('dashboardT.kpi.totalProducts')} 
            value={kpiData.totalProductos.value}
            trend={kpiData.totalProductos.trend}
            trendValue={kpiData.totalProductos.trendValue}
            icon="📦"
          />
        </section>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 24,
          alignItems: 'start'
        }}>
          
          {/* 2. ⚡ COLUMNA PRINCIPAL: GRÁFICOS Y WIDGETS */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <Ventas30DiasWidget 
              title={t('dashboardT.last30days')}
            />
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20
            }}>
              <ProductosMasVendidosWidget 
                title={t('dashboardT.topProducts')}
                height={250}
              />
              <VentasPorAreaWidget 
                title={t('dashboardT.salesByArea')}
                height={250}
              />
            </div>
          </section>

          {/* 3. 🚀 COLUMNA SECUNDARIA: ACCIONES Y ALERTAS */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AlertasInventarioWidget title={t('dashboardT.alerts')} />
            <QuickActions actions={accionesRapidas} />
          </aside>
        </div>

      </main>
    </div>
  );
}

export default Dashboard;