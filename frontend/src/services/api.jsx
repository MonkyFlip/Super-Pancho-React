// src/services/api.jsx
import axios from 'axios';
import { saveSession, clearSession } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 300000, // 5 minutos para operaciones pesadas
});

/**
 * Keys de almacenamiento (coinciden con auth.js pero mantenemos compatibilidad local aquí)
 */
const AUTH_TOKEN_KEY = 'app_auth_token';
const AUTH_USER_KEY = 'app_auth_user';

/**
 * Inicializar token en headers si existe en localStorage
 */
try {
  const existingToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (existingToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
  }
} catch (e) {
  // ignorar errores de storage
}

/* ---------------------------
   Helpers de autenticación (mantener compatibilidad con llamadas actuales)
   --------------------------- */

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      delete api.defaults.headers.common['Authorization'];
    }
  } catch (e) { /* ignore */ }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
  } catch (e) {}
};

export const storeUser = (user) => {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || null));
  } catch (e) {}
};

export const getStoredUser = () => {
  try {
    const s = localStorage.getItem(AUTH_USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
};

export const clearStoredUser = () => {
  try { localStorage.removeItem(AUTH_USER_KEY); } catch (e) {}
};

/* ---------------------------
   Logout centralizado
   --------------------------- */

export const logout = async (opts = {}) => {
  try {
    clearAuthToken();
    clearStoredUser();
    clearSession();
  } catch (e) { /* noop */ }

  try {
    if (!opts.suppressRequest) {
      await api.post('/logout').catch(() => {});
    }
  } catch (e) {}

  try { window.location.hash = '#/login'; } catch (e) {}
};

/* ---------------------------
   Interceptors (debug + manejo 401)
   --------------------------- */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    // log breve
    // console.warn('API error', status, error?.response?.data);
    if (status === 401) {
      try { clearAuthToken(); } catch (e) {}
      try { clearStoredUser(); } catch (e) {}
      try { clearSession(); } catch (e) {}
      try { window.location.hash = '#/login'; } catch (e) {}
    }
    return Promise.reject(error);
  }
);

/* ---------------------------
   Autenticación: login, registro y me
   --------------------------- */

/**
 * login(usuario, password)
 * - Maneja respuesta con forma { user, token, redirect, expiresIn } o la forma plana.
 * - Guarda token y user cuando vienen en la respuesta y también centraliza con saveSession.
 * - Devuelve el objeto de respuesta axios para manejo en vistas.
 */
export const login = async (usuario, password) => {
  const res = await api.post('/login', { usuario, password });
  const body = res?.data ?? {};

  // extraer token / user de varias formas posibles
  const token = body.token ?? body.accessToken ?? body.access_token ?? body.tokenJwt ?? body.jwt;
  const user = body.user ?? body.usuario ?? body.data ?? (Object.keys(body || {}).length && typeof body.user === 'undefined' ? body : null);

  if (token) {
    setAuthToken(token);
  }
  if (user) {
    storeUser(user);
  }

  // Determinar expiresIn (segundos) si el backend lo provee
  const expires = body.expiresIn ?? body.expires_in ?? body.expires ?? null;
  const expiresInSec = typeof expires === 'number' ? expires : (typeof expires === 'string' && /^\d+$/.test(expires) ? Number(expires) : null);

  // Guardar sesión centralizada (auth.js) para persistencia y control por rol
  try {
    saveSession({ user, token, expiresInSec: expiresInSec ?? 3600 });
  } catch (e) {
    // noop
  }

  return res;
};

export const registro = (usuario) =>
  api.post('/registro', usuario);

/**
 * getMe
 * - Solicita /me; si usas JWT, la petición debe incluir Authorization header (setAuthToken lo hace)
 */
export const getMe = (params = {}) => api.get('/me', { params });

/* ---------------------------
   Usuarios
   --------------------------- */

export const getUsuarios = (params = {}) => api.get('/usuarios', { params });
export const crearUsuario = (usuario) => api.post('/usuarios', usuario);
export const actualizarUsuario = (id, usuario) => api.put(`/usuarios/${id}`, usuario);
export const eliminarUsuario = (id) => api.delete(`/usuarios/${id}`);

/* ---------------------------
   Productos
   --------------------------- */

export const getProductos = (params = {}) => api.get('/productos', { params });
export const crearProducto = (producto) => api.post('/productos', producto);
export const actualizarProducto = (id, producto) => api.put(`/productos/${id}`, producto);
export const eliminarProducto = (id) => api.delete(`/productos/${id}`);

/* ---------------------------
   Clientes
   --------------------------- */

export const getClientes = (params = {}) => api.get('/clientes', { params });
export const crearCliente = (cliente) => api.post('/clientes', cliente);
export const actualizarCliente = (id, cliente) => api.put(`/clientes/${id}`, cliente);
export const eliminarCliente = (id) => api.delete(`/clientes/${id}`);

/* ---------------------------
   Ventas
   --------------------------- */

export const getVentas = (params = {}) => api.get('/ventas', { params });
export const crearVenta = (venta) => api.post('/ventas', venta);
export const actualizarVenta = (id, venta) => api.put(`/ventas/${id}`, venta);
export const eliminarVenta = (id) => api.delete(`/ventas/${id}`);

/* ---------------------------
   Auditoría / Actividades
   --------------------------- */

export const getAuditoria = (params = {}) => api.get('/auditoria', { params });
export const getRecentActivities = (params = {}) => api.get('/actividades/recientes', { params });

/* ---------------------------
   Reportes / Inventario / Estadísticas
   --------------------------- */

export const getInventarioResumen = (params = {}) => api.get('/reportes/inventario/resumen', { params });
export const exportInventario = (params = {}) => api.post('/reportes/inventario/export', params);

export const getEstadisticasResumen = (params = {}) => api.get('/reportes/estadisticas/resumen', { params });

export const getDashboardResumen = (params = {}) => api.get('/dashboard/resumen', { params });
export const getDashboardSeries = (params = {}) => api.get('/dashboard/series', { params });

/* ---------------------------
   BD / Exportaciones / Seeding
   --------------------------- */

export const exportarBD = (config = {}) => api.post('/bd/exportar', config);
export const getExportHistory = (params = {}) => api.get('/bd/exportaciones', { params });

export const verificarBase = () => api.get('/verifica_db');
export const crearBase = (config = {}) => api.post('/crear_db', config);

/* ---------------------------
   Configuración
   --------------------------- */

export const getConfiguracion = (params = {}) => api.get('/configuracion', { params });
export const guardarConfiguracion = (payload) => api.post('/configuracion', payload);

/* ---------------------------
   Analíticas / utilidades
   --------------------------- */

export const generarAnalisis = (params = {}) => api.get('/analisis/generar', { params });
export const obtenerGraficas = (params = {}) => api.get('/analisis/graficas', { params });

/* ---------------------------
   Export default axios instance
   --------------------------- */

export default api;
