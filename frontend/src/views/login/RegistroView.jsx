import React, { useEffect, useState } from 'react';
import { registro } from '../../services/api';
import { temas } from '../../styles/temas';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const THEME_KEY = 'app_theme_selected';

const RegistroView = ({ onRegistered, onCancel }) => {
  const [usuario, setUsuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const [themeKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });

  useEffect(() => { try { localStorage.setItem(THEME_KEY, themeKey); } catch {} }, [themeKey]);

  const tema = temas[themeKey] || temas.bosque_claro;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (!usuario || !password) {
      setError('Completa los campos requeridos');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const payload = { usuario, nombre, password };
      const res = await registro(payload);
      setLoading(false);
      setOk('Registro exitoso. Ya puedes iniciar sesión.');
      if (typeof onRegistered === 'function') onRegistered(res.data);
    } catch (err) {
      setLoading(false);
      console.error('Registro error', err);
      const msg = err?.response?.data?.error || 'Error en el registro';
      setError(msg);
    }
  };

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

  const inputContainer = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  };

  const eyeButtonStyle = {
    position: 'absolute',
    right: 12,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: tema.texto,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center'
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
      <div style={{
        background: tema.fondo,
        borderRadius: 14,
        boxShadow: `0 12px 36px ${tema.acento}22`,
        border: `1px solid ${tema.borde}`,
        maxWidth: 520,
        width: '100%',
        padding: 26
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: tema.texto }}>Registro</h2>
            <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>Crea una cuenta nueva</div>
          </div>
          <button
            type="button"
            onClick={() => { if (typeof onCancel === 'function') onCancel(); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: tema.borde,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <label style={{ fontSize: 13, color: '#444' }}>Usuario</label>
          <input style={inputStyle} type="text" placeholder="usuario" value={usuario} onChange={e => setUsuario(e.target.value)} required />

          <label style={{ fontSize: 13, color: '#444' }}>Nombre completo</label>
          <input style={inputStyle} type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />

          <label style={{ fontSize: 13, color: '#444' }}>Contraseña</label>
          <div style={inputContainer}>
            <input
              style={inputStyle}
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              style={eyeButtonStyle}
              onClick={() => setShowPass(!showPass)}
              title={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPass ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <label style={{ fontSize: 13, color: '#444' }}>Repetir contraseña</label>
          <div style={inputContainer}>
            <input
              style={inputStyle}
              type={showPass2 ? 'text' : 'password'}
              placeholder="Repetir contraseña"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              required
            />
            <button
              type="button"
              style={eyeButtonStyle}
              onClick={() => setShowPass2(!showPass2)}
              title={showPass2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPass2 ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
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
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              onClick={() => { if (typeof onCancel === 'function') onCancel(); }}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: '#fff',
                border: `1px solid ${tema.borde}`,
                cursor: 'pointer'
              }}
            >
              Volver
            </button>
          </div>

          {error && <div style={{ color: '#a33', fontSize: 13 }}>{error}</div>}
          {ok && <div style={{ color: '#0a7', fontSize: 13 }}>{ok}</div>}
        </form>
      </div>
    </div>
  );
};

export default RegistroView;
