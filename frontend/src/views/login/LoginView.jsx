// src/views/login/LoginView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { login, storeUser, setAuthToken } from '../../services/api';
import { saveSession } from '../../services/auth';
import { temas } from '../../styles/temas';
import RegistroView from './RegistroView';
import { getHomeRouteForUser } from '../../services/auth';

const THEME_KEY = 'app_theme_selected';

const LoginView = ({ onLoginSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [themeKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });

  const [showRegister, setShowRegister] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, themeKey); } catch {}
  }, [themeKey]);

  const tema = temas[themeKey] || temas.bosque_claro;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Shortcut dev debug
      if (usuario === 'debug' && password === '1234') {
        const debugUser = { _id: 'debug-local', usuario: 'debug', rol: 'debug', name: 'debug' };
        try {
          storeUser(debugUser);
          saveSession({ user: debugUser, token: 'debug-token', expiresInSec: 60 * 60 });
        } catch {}
        window.location.hash = '#/debug/dashboard';
        return;
      }

      const res = await login(usuario, password);
      const body = res?.data ?? {};

      // Normalizar token y usuario del body
      const token = body.token ?? body.accessToken ?? body.access_token ?? body.tokenJwt ?? body.jwt ?? null;
      const userFromBody = body.user ?? body.usuario ?? (Object.keys(body || {}).length ? body : null);

      // Persistir token (setAuthToken guarda en localStorage y configura headers si está implementado)
      if (token) {
        try {
          setAuthToken(token);
        } catch (err) {
          try { localStorage.setItem('app_auth_token', token); } catch {}
        }
      }

      // Persistir usuario en storage mediante helper storeUser si existe, y fallback manual
      if (userFromBody) {
        try {
          storeUser(userFromBody);
        } catch (err) {
          try { localStorage.setItem('app_auth_user', JSON.stringify(userFromBody)); } catch {}
        }
      }

      // Determinar expiresIn (segundos)
      const expires = body.expiresIn ?? body.expires_in ?? body.expires ?? null;
      const expiresInSec = typeof expires === 'number' ? expires : (typeof expires === 'string' && /^\d+$/.test(expires) ? Number(expires) : null);

      // Guardar sesión centralizada (auth.js) para consistencia
      try {
        saveSession({ user: userFromBody, token, expiresInSec: expiresInSec ?? 3600 });
      } catch (e) {
        // fallback manual ya aplicado arriba si saveSession no existe o falla
      }

      // Notificar a la app que cambió auth y evitar condición de carrera antes de redirigir
      window.dispatchEvent(new Event('auth:changed'));
      setTimeout(() => {
        // Si backend sugiere redirect, usarlo; si no, inferir por rol
        const redirectPath = body.redirect;
        if (redirectPath) {
          window.location.hash = `#${redirectPath}`;
        } else {
          const finalUser = userFromBody || JSON.parse(localStorage.getItem('app_auth_user') || 'null');
          const home = getHomeRouteForUser(finalUser) || '#/';
          window.location.hash = home;
        }
        // notificar otra vez por si hay listeners que reaccionen tras el cambio de hash
        window.dispatchEvent(new Event('auth:changed'));

        if (typeof onLoginSuccess === 'function') {
          try { onLoginSuccess(body); } catch (e) { /* silent */ }
        }
      }, 0);

    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Credenciales inválidas o error de conexión';
      setError(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  if (showRegister) {
    return (
      <RegistroView
        onRegistered={(data) => {
          setShowRegister(false);
          if (data?.usuario) setUsuario(data.usuario);
          setError('Registro exitoso, inicia sesión con tus credenciales');
        }}
        onCancel={() => setShowRegister(false)}
      />
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${tema.borde}`,
    background: tema.secundario,
    color: tema.texto,
    fontSize: 14,
    boxSizing: 'border-box'
  };

  const cardStyle = {
    background: tema.fondo,
    borderRadius: 14,
    boxShadow: `0 12px 36px ${tema.acento}22`,
    border: `1px solid ${tema.borde}`,
    maxWidth: 420,
    width: '100%',
    padding: 28,
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      color: tema.texto
    }}>
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', gap: 28, alignItems: 'center', justifyContent: 'center' }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0, fontSize: 20, color: tema.texto }}>Iniciar sesión</h1>
            <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>Ingresa tu usuario o clave para continuar</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <label style={{ fontSize: 13, color: '#444' }}>Usuario o clave</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="usuario o clave"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              required
            />

            <label style={{ fontSize: 13, color: '#444', marginTop: 6 }}>Contraseña</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                background: tema.primario,
                color: '#fff',
                padding: '12px 14px',
                borderRadius: 10,
                border: 'none',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: `0 10px 26px ${tema.acento}33`
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            {error && (
              <div style={{ color: '#a33', fontSize: 13, textAlign: 'center', marginTop: 6 }}>{error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tema.borde,
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ¿Eres nuevo? Regístrate
              </button>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); alert('Función de recuperar contraseña no implementada.'); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default LoginView;
