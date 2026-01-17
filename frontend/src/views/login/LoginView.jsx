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
  
  // Mantenemos la lógica del tema
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

  // --- LÓGICA DE LOGIN (Sin cambios) ---
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

      const token = body.token ?? body.accessToken ?? body.access_token ?? body.tokenJwt ?? body.jwt ?? null;
      const userFromBody = body.user ?? body.usuario ?? (Object.keys(body || {}).length ? body : null);

      if (token) {
        try { setAuthToken(token); } catch (err) { try { localStorage.setItem('app_auth_token', token); } catch {} }
      }

      if (userFromBody) {
        try { storeUser(userFromBody); } catch (err) { try { localStorage.setItem('app_auth_user', JSON.stringify(userFromBody)); } catch {} }
      }

      const expires = body.expiresIn ?? body.expires_in ?? body.expires ?? null;
      const expiresInSec = typeof expires === 'number' ? expires : (typeof expires === 'string' && /^\d+$/.test(expires) ? Number(expires) : null);

      try {
        saveSession({ user: userFromBody, token, expiresInSec: expiresInSec ?? 3600 });
      } catch (e) {}

      window.dispatchEvent(new Event('auth:changed'));
      setTimeout(() => {
        const redirectPath = body.redirect;
        if (redirectPath) {
          window.location.hash = `#${redirectPath}`;
        } else {
          const finalUser = userFromBody || JSON.parse(localStorage.getItem('app_auth_user') || 'null');
          const home = getHomeRouteForUser(finalUser) || '#/';
          window.location.hash = home;
        }
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

  // --- NUEVOS ESTILOS PARA DISEÑO SPLIT SCREEN ---
  
  const layoutStyle = {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: tema.fondo,
    color: tema.texto
  };

  // Panel Izquierdo (Visual/Branding)
  const leftPanelStyle = {
    flex: '1.2', // Ocupa un poco más de la mitad (60% aprox)
    background: `linear-gradient(135deg, ${tema.primario}, ${tema.secundario})`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    color: '#fff',
    position: 'relative',
    // Ocultar en móviles si lo deseas, o cambiar a flex-direction column en CSS global
  };

  // Panel Derecho (Formulario)
  const rightPanelStyle = {
    flex: '0.8', // Ocupa el resto (40% aprox)
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: tema.fondo,
    padding: 40,
    boxShadow: '-10px 0 20px rgba(0,0,0,0.05)', // Sutil sombra separadora
    zIndex: 2
  };

  const formContainerStyle = {
    width: '100%',
    maxWidth: 400, // Evita que los inputs sean infinitamente anchos
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  };

  const inputStyle = {
    width: '100%',
    padding: '16px 16px', // Más padding para que se vea moderno
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    background: tema.secundario, // Fondo sutil para inputs
    color: tema.texto,
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  };

  const buttonStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: 8,
    background: tema.primario,
    color: '#fff',
    border: 'none',
    fontWeight: 'bold',
    fontSize: 16,
    cursor: loading ? 'wait' : 'pointer',
    marginTop: 10,
    boxShadow: `0 4px 14px ${tema.acento}44`
  };

  return (
    <div style={layoutStyle}>
      
      {/* SECCIÓN IZQUIERDA: Visual y Branding */}
      <div className="login-visual-panel" style={leftPanelStyle}>
        {/* Círculos decorativos de fondo (opcional) */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%', width: '50%', paddingBottom: '50%',
          background: 'rgba(255,255,255,0.1)', borderRadius: '50%'
        }}></div>
        
        <div style={{ zIndex: 2, textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', margin: 0, fontWeight: 800 }}>SuperTech</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, marginTop: 10 }}>Gestión inteligente para tu negocio</p>
        </div>
      </div>

      {/* SECCIÓN DERECHA: Formulario */}
      <div style={rightPanelStyle}>
        <div style={formContainerStyle}>
          
          <div>
            <h2 style={{ fontSize: 28, margin: '0 0 8px 0', color: tema.texto }}>Bienvenido de nuevo</h2>
            <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Por favor ingresa tus datos para acceder.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Usuario</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Ej. admin"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Contraseña</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>
          </form>

          {error && (
            <div style={{ 
              padding: 12, borderRadius: 6, background: '#fee2e2', color: '#991b1b', 
              fontSize: 14, textAlign: 'center', border: '1px solid #fecaca' 
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <button 
              type="button" 
              onClick={() => setShowRegister(true)}
              style={{ background: 'none', border: 'none', color: tema.primario, cursor: 'pointer', fontWeight: 600 }}
            >
              Crear cuenta
            </button>
            
            <button 
               type="button"
               onClick={() => alert('Contacta al administrador.')}
               style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13 }}
            >
              ¿Olvidaste tu clave?
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 30, color: '#aaa', fontSize: 12 }}>
            © 2025 Supermercado System
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginView;