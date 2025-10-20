// src/App.jsx
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

  // Verificar base de datos al iniciar
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

  // Escuchar cambios de hash (rutas)
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Escuchar cambios de sesión en localStorage o eventos internos
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

  // Si la app detecta sesión activa y la ruta es root/login, redirige al home según rol
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

  // Mostrar estado de verificación DB
  if (dbDisponible === null) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50, color: (temas[themeKey] || temas.bosque_claro).texto }}>
        Verificando base de datos...
      </div>
    );
  }

  if (!dbDisponible) return <AvisoView />;

  const [first, second] = route;

  // Debug route (development)
  if (first === 'debug' && second === 'dashboard') return <DebugDashboard />;

  // Si no autenticado, mostrar LoginView (LoginView debe despachar 'auth:changed' tras login exitoso)
  if (!authState) {
    return <LoginView />;
  }

  // Si autenticado, obtener usuario y decidir ruta/privilegios
  const storedUser = getStoredUser();

  // Admin
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

  // Por defecto
  return <LoginView />;
};

export default App;
