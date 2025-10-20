// src/services/auth.js
// Gestión de sesión y utilidades de rol
const STORAGE_USER = 'app_auth_user';
const STORAGE_TOKEN = 'app_auth_token';
const STORAGE_TOKEN_EXPIRES = 'app_auth_token_expires';

/**
 * Guarda sesión en localStorage.
 * user: objeto usuario (se stringify)
 * token: string
 * expiresInSec: número de segundos hasta expiración (opcional)
 */
export function saveSession({ user, token, expiresInSec } = {}) {
  try {
    if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    if (token) localStorage.setItem(STORAGE_TOKEN, token);
    if (typeof expiresInSec === 'number') {
      const ts = Date.now() + expiresInSec * 1000;
      localStorage.setItem(STORAGE_TOKEN_EXPIRES, String(ts));
    } else {
      localStorage.removeItem(STORAGE_TOKEN_EXPIRES);
    }
  } catch (e) {}
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_TOKEN_EXPIRES);
  } catch (e) {}
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getAuthToken() {
  try { return localStorage.getItem(STORAGE_TOKEN); } catch { return null; }
}

export function tokenExpiresAt() {
  try {
    const v = localStorage.getItem(STORAGE_TOKEN_EXPIRES);
    return v ? Number(v) : null;
  } catch { return null; }
}

export function isAuthenticated() {
  const token = getAuthToken();
  const exp = tokenExpiresAt();
  if (!token) return false;
  if (exp && Date.now() > exp) return false;
  return true;
}

/** Normaliza y devuelve el rol en minúsculas si existe */
export function getRole(normalizeFromUser) {
  const u = normalizeFromUser || getStoredUser();
  if (!u) return null;
  const r = u?.rol ?? u?.role ?? u?.roleName ?? u?.role_type ?? u?.role?.name ?? null;
  return r ? String(r).toLowerCase() : null;
}

export function isAdmin(user) {
  const r = getRole(user);
  return !!r && r.includes('admin');
}

export function isTrabajador(user) {
  const r = getRole(user);
  return !!r && (r.includes('trabajador') || r.includes('worker') || r.includes('empleado') || r.includes('staff'));
}

export function isCliente(user) {
  const r = getRole(user);
  return !!r && (r.includes('cliente') || r.includes('customer') || r.includes('client'));
}

/** Devuelve la ruta home apropiada según rol (para redirección tras login) */
export function getHomeRouteForUser(user) {
  if (!user) return '#/';
  if (isAdmin(user)) return '#/admin/dashboard';
  if (isTrabajador(user)) return '#/trabajadores/inicio';
  if (isCliente(user)) return '#/cliente/perfil';
  return '#/';
}

/**
 * logout
 * - Limpia la sesión local y redirige al login.
 * - Si se desea llamar al endpoint del backend para logout, importarlo desde services/api y hacerlo desde el caller.
 */
export async function logout(options = { redirect: true }) {
  try {
    clearSession();
  } catch (e) {}
  try {
    if (options.redirect) window.location.hash = '#/login';
  } catch (e) {}
}
