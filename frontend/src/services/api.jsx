// src/services/api.jsx
import axios from 'axios';
import { saveSession, clearSession } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 300000,
});

/* ---------------------------
   Storage keys
   --------------------------- */
const AUTH_TOKEN_KEY = 'app_auth_token';
const AUTH_USER_KEY = 'app_auth_user';

/* ---------------------------
   Initialize token from storage (one-time)
   --------------------------- */
try {
  const existingToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (existingToken) api.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
} catch (e) {}

/* ---------------------------
   Request interceptor: garantiza que cada petición lleve el token actual
   --------------------------- */
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers && config.headers.Authorization) {
      delete config.headers.Authorization;
    }
  } catch (e) {
    // no bloquear la petición por error en storage
  }
  return config;
}, (error) => Promise.reject(error));

/* ---------------------------
   Auth helpers
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
  } catch (e) {}
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
  } catch (e) {}
};

export const storeUser = (user) => {
  try { localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || null)); } catch (e) {}
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
   Logout
   --------------------------- */
export const logout = async (opts = {}) => {
  try { clearAuthToken(); clearStoredUser(); clearSession(); } catch (e) {}
  try { if (!opts.suppressRequest) await api.post('/logout').catch(() => {}); } catch (e) {}
  try { window.location.hash = '#/login'; } catch (e) {}
};

/* ---------------------------
   Response interceptor (401 handling + surface error body)
   --------------------------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    // si hay body con JSON, anexarlo al error para que el frontend lo muestre
    if (error?.response?.data) {
      error.serverData = error.response.data;
    }
    if (status === 401) {
      try { clearAuthToken(); } catch (e) {}
      try { clearStoredUser(); } catch (e) {}
      try { clearSession(); } catch (e) {}
      try { window.location.hash = '#/login'; } catch (e) {}
    }
    return Promise.reject(error);
  }
);
export const getTopProductos = () => {
  return api.get('/api/reportes/top-productos');
};
export const getReporteVentasPorArea = () => {
  return api.get('/api/reportes/ventas-por-area');
};
/* ---------------------------
   Auth endpoints
   --------------------------- */
export const login = async (usuario, password) => {
  const res = await api.post('/login', { usuario, password });
  const body = res?.data ?? {};
  const token = body.token ?? body.accessToken ?? body.access_token ?? body.tokenJwt ?? body.jwt;
  const user = body.user ?? body.usuario ?? body.data ?? (Object.keys(body || {}).length && typeof body.user === 'undefined' ? body : null);

  if (token) setAuthToken(token);
  if (user) storeUser(user);

  const expires = body.expiresIn ?? body.expires_in ?? body.expires ?? null;
  const expiresInSec = typeof expires === 'number' ? expires : (typeof expires === 'string' && /^\d+$/.test(expires) ? Number(expires) : null);

  try { saveSession({ user, token, expiresInSec: expiresInSec ?? 3600 }); } catch (e) {}

  return res;
};

export const registro = (usuario) => api.post('/registro', usuario);
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
export const getProductosByArea = (areaId) => api.get(`/api/productos/${areaId}`);
export const crearProducto = (producto) => api.post('/productos', producto);
export const actualizarProducto = (id, producto) => api.put(`/productos/${id}`, producto);
export const eliminarProducto = (id) => api.delete(`/productos/${id}`);

/* ---------------------------
   Dashboard Widgets
   --------------------------- */
export const getAlertasInventario = (params = {}) => api.get('/dashboard/alertas-inventario', { params });
export const getProductosMasVendidos = (params = {}) => api.get('/dashboard/productos-mas-vendidos', { params });
export const getVentasPorArea = (params = {}) => api.get('/dashboard/ventas-por-area', { params });
export const getKPIs = (params = {}) => api.get('/dashboard/kpis', { params });
export const getVentas30Dias = (params = {}) => api.get('/dashboard/ventas-30-dias', { params });

/* ---------------------------
   Clientes
   --------------------------- */
export const getClientes = (params = {}) => api.get('/clientes', { params });
export const crearCliente = (cliente) => api.post('/clientes', cliente);
export const actualizarCliente = (id, cliente) => api.put(`/clientes/${id}`, cliente);
export const eliminarCliente = (id) => api.delete(`/clientes/${id}`);
/* ---------------------------
   Áreas
   --------------------------- */
export const getAreas = (params = {}) => api.get('/areas', { params });
export const getApiAreas = (params = {}) => api.get('/api/areas', { params });
export const crearArea = (area) => api.post('/areas', area);
export const actualizarArea = (id, area) => api.put(`/areas/${id}`, area);
export const eliminarArea = (id) => api.delete(`/areas/${id}`);

/* ---------------------------
   Ventas
   --------------------------- */
export const getVentas = (params = {}) => api.get('/api/ventas', { params });
export const crearVenta = (venta) => api.post('/api/ventas', venta);
export const actualizarVenta = (id, venta) => api.put(`/api/ventas/${id}`, venta);
export const eliminarVenta = (id) => api.delete(`/api/ventas/${id}`);
export const resumen30dias = (params = {}) => api.get('/api/ventas/resumen-30-dias', { params })

/* ---------------------------
   Auditoría / Actividades
   --------------------------- */
export const getAuditoria = (params = {}) => api.get('/auditoria', { params });
export const getRecentActivities = (params = {}) => api.get('/actividades/recientes', { params });

/* ---------------------------
   Reportes / Dashboard
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
   Regresiones / Gráficos de ventas
   --------------------------- */
/* Regresión simple (POST preferible): body { samples } or { collection, x_field, y_field, limit } */
export const ventasRegresionSimple = (body = {}) => api.post('/regresion/simple', body);

/* Regresión múltiple (POST): body { samples } or { collection, features, target, limit } */
export const ventasRegresionMultiple = (body = {}) => api.post('/regresion/multiple', body);

/* ---------------------------
   Estado de poblamiento / multimedia
   --------------------------- */
export const getProgreso = (params = {}) => api.get('/db/progreso', { params });

/* ---------------------------
   Export default axios instance
   --------------------------- */
export default api;
