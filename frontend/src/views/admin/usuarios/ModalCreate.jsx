// src/views/usuarios/ModalCreate.jsx
import React, { useEffect, useState, useRef } from 'react';
import { FaUserPlus } from 'react-icons/fa';
import { crearUsuario } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';

const ModalCreate = ({ visible, onClose, onSaveSuccess, tema }) => {
  const [form, setForm] = useState({
    usuario: '',
    password: '',
    rol: 'cliente',
    activo: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!visible) {
      setForm({
        usuario: '',
        password: '',
        rol: 'cliente',
        activo: true
      });
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    const onAuthStorage = (e) => {
      if (!e) return;
      if (e.key === 'app_auth_token' || e.key === 'app_auth_user' || e.key === null) {
        if (!isAuthenticated()) {
          try { onClose?.(); } catch {}
          window.location.hash = '#/login';
        }
      }
    };
    window.addEventListener('storage', onAuthStorage);
    return () => window.removeEventListener('storage', onAuthStorage);
  }, [onClose]);

  if (!visible) return null;

  const validate = () => {
    if (!form.usuario || form.usuario.trim().length < 3) return 'Usuario: mínimo 3 caracteres';
    if (!form.password || form.password.length < 4) return 'Password: mínimo 4 caracteres';
    if (!['administrador', 'trabajador', 'cliente'].includes(form.rol)) return 'Rol inválido';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated()) {
      setError('Sesión no válida. Por favor, inicia sesión de nuevo.');
      window.location.hash = '#/login';
      return;
    }

    const vErr = validate();
    if (vErr) {
      setError(vErr);
      return;
    }

    setLoading(true);
    try {
      // payload coincide con UsuarioCreate: { usuario, password, rol, activo }
      await crearUsuario({
        usuario: form.usuario.trim(),
        password: form.password,
        rol: form.rol,
        activo: !!form.activo
      });
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || 'Error al crear usuario';
      if (status === 401 || status === 403) {
        setError('Sesión expirada o no autorizada. Redirigiendo a login...');
        try { onClose?.(); } catch {}
        window.location.hash = '#/login';
      } else {
        setError(serverMsg);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <div style={backdropStyle()}>
      <form onSubmit={submit} style={modalStyle(tema)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tema.primario, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <FaUserPlus />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Nuevo usuario</div>
              <div style={{ fontSize: 13, color: '#666' }}>Crea un usuario con los campos del modelo</div>
            </div>
          </div>

          <div>
            <button type="button" onClick={onClose} style={closeBtnStyle(tema)}>Cerrar</button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#444' }}>Usuario</label>
          <input
            value={form.usuario}
            onChange={(e) => setForm(f => ({ ...f, usuario: e.target.value }))}
            placeholder="usuario (3-64 caracteres)"
            style={inputStyle(tema)}
          />

          <label style={{ fontSize: 13, color: '#444' }}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="mínimo 4 caracteres"
            style={inputStyle(tema)}
          />

          <label style={{ fontSize: 13, color: '#444' }}>Rol</label>
          <select
            value={form.rol}
            onChange={(e) => setForm(f => ({ ...f, rol: e.target.value }))}
            style={{ ...inputStyle(tema), padding: 10 }}
          >
            <option value="administrador">administrador</option>
            <option value="trabajador">trabajador</option>
            <option value="cliente">cliente</option>
          </select>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm(f => ({ ...f, activo: e.target.checked }))}
            /> Activo
          </label>
        </div>

        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle(tema)}>Cancelar</button>
          <button type="submit" disabled={loading} style={primaryBtnStyle(tema)}>{loading ? 'Guardando...' : 'Crear'}</button>
        </div>
      </form>
    </div>
  );
};

const backdropStyle = () => ({
  position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(8,12,20,0.3)', zIndex: 8000
});
const modalStyle = (tema) => ({
  width: 520, maxWidth: 'calc(100% - 32px)', background: '#fff', padding: 18, borderRadius: 12, border: `1px solid ${tema.borde}`, boxShadow: '0 20px 48px rgba(16,24,40,0.08)'
});
const inputStyle = (tema) => ({ padding: 10, borderRadius: 8, border: `1px solid ${tema.borde}`, outline: 'none', background: '#fff', color: tema.texto });
const primaryBtnStyle = (tema) => ({
  padding: '8px 14px', border: 'none', borderRadius: 8, background: tema.primario, color: '#fff', cursor: 'pointer', fontWeight: 800
});
const secondaryBtnStyle = (tema) => ({
  padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(16,24,40,0.06)', background: 'transparent', cursor: 'pointer'
});
const closeBtnStyle = (tema) => ({ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: tema.texto });

export default ModalCreate;
