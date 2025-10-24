import React, { useEffect, useState } from 'react';
import LoginView from './views/login/LoginView';
import AvisoView from './views/login/AvisoView';
import DashboardAdmin from './views/admin/Dashboard';
import DashboardTrabajador from './views/trabajador/Dashboard';
import DashboardCliente from './views/cliente/Dashboard';
import DebugDashboard from './views/debug/Dashboard';
import api from './services/api';
import { temas } from './styles/temas';
import { isAuthenticated, getStoredUser, getHomeRouteForUser } from './services/auth';

const parseHash = () => {
  const h = (window.location.hash || '#/').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  return parts; // e.g. ['admin','dashboard']
};

const App = () => {
  const [dbDisponible, setDbDisponible] = useState(null);
  const [route, setRoute] = useState(parseHash());
  const [authState, setAuthState] = useState(() => isAuthenticated());
  const [themeKey, setThemeKey] = useState(() => {
    try { return localStorage.getItem('app_theme_selected') || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });

  useEffect(() => {
    const verificarDB = async () => {
      try {
        const res = await api.get('/verifica_db');
        setDbDisponible(res.data.ok);
      } catch (err) {
        setDbDisponible(false);
      }
    };
    verificarDB();
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e) {
        setAuthState(isAuthenticated());
        return;
      }
      const keys = ['app_auth_token', 'app_auth_user', 'app_auth_token_expires', 'app_theme_selected'];
      if (keys.includes(e.key)) {
        setAuthState(isAuthenticated());
        if (e.key === 'app_theme_selected') {
          setThemeKey(e.newValue || 'bosque_claro');
        }
      }
    };
    const onAuthEvent = () => setAuthState(isAuthenticated());
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:changed', onAuthEvent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:changed', onAuthEvent);
    };
  }, []);

  useEffect(() => {
    try {
      if (!authState) return;
      const [first] = route;
      if (!first || first === 'login' || first === '/') {
        const user = getStoredUser();
        const home = getHomeRouteForUser(user) || '#/';
        if (window.location.hash !== home) window.location.hash = home;
      }
    } catch (e) {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, route]);

  if (dbDisponible === null) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50, color: (temas[themeKey] || temas.bosque_claro).texto }}>
        Verificando base de datos...
      </div>
    );
  }

  if (!dbDisponible) return <AvisoView />;

  const [first, second, third] = route;

  // Debug route (development)
  if (first === 'debug' && second === 'dashboard') return <DebugDashboard />;

  // Si no autenticado, mostrar LoginView
  if (!authState) {
    return <LoginView />;
  }

  // Si autenticado, obtener usuario y decidir ruta/privilegios
  const storedUser = getStoredUser();

  // Permitir acceso directo a /reportes/analisis (sin prefijo admin)
  // Esto hace que hashes como "#/reportes/analisis" funcionen y monten la UI de admin,
  // que a su vez maneja la subruta y mostrará AnalisisV.
  if (first === 'reportes' && second === 'analisis') {
    return <DashboardAdmin />;
  }

  // Admin (mantener compatibilidad con hashes que comienzan por 'admin')
  if (first === 'admin' || getHomeRouteForUser(storedUser) === '#/admin/dashboard') {
    return <DashboardAdmin />;
  }

  // Trabajador
  if (first === 'trabajadores' || getHomeRouteForUser(storedUser) === '#/trabajadores/inicio') {
    return <DashboardTrabajador />;
  }

  // Cliente
  if (first === 'cliente' || getHomeRouteForUser(storedUser) === '#/cliente/perfil') {
    return <DashboardCliente />;
  }

  // Fallback: redirigir a home de rol si no coincidió ninguna ruta explícita
  const home = getHomeRouteForUser(storedUser) || '#/';
  if (window.location.hash !== home) {
    window.location.hash = home;
    return null;
  }

  return <LoginView />;
};

export default App;
