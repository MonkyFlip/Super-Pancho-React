import React, { useEffect, useState, useRef } from 'react';
import { FaPlus } from 'react-icons/fa';
import api from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';

const ModalCreate = ({ visible, onClose, onSaveSuccess, tema }) => {
  const [form, setForm] = useState({
    nombre: ''
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
      setForm({ nombre: '' });
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
    if (!form.nombre || form.nombre.trim().length < 2) return 'Nombre: mínimo 2 caracteres';
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
      await api.post('/areas', {
        nombre: form.nombre.trim()
      });
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || 'Error al crear área';
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
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tema.primario, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <FaPlus />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Nueva área</div>
              <div style={{ fontSize: 13, color: '#666' }}>Registra una nueva área</div>
            </div>
          </div>

          <div>
            <button type="button" onClick={onClose} style={closeBtnStyle(tema)}>Cerrar</button>
          </div>
        </div>

        {/* Campos del formulario */}
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>

          <label style={labelStyle}>Nombre</label>
          <input
            value={form.nombre}
            onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej. Lácteos"
            style={inputStyle(tema)}
          />
        </div>

        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle(tema)}>Cancelar</button>
          <button type="submit" disabled={loading} style={primaryBtnStyle(tema)}>
            {loading ? 'Guardando...' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ==== Estilos reutilizados ==== */
const backdropStyle = () => ({
  position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
  background: 'rgba(8,12,20,0.3)', zIndex: 8000
});
const modalStyle = (tema) => ({
  width: 480, maxWidth: 'calc(100% - 32px)', background: '#fff',
  padding: 18, borderRadius: 12, border: `1px solid ${tema.borde}`,
  boxShadow: '0 20px 48px rgba(16,24,40,0.08)'
});
const inputStyle = (tema) => ({
  padding: 10, borderRadius: 8, border: `1px solid ${tema.borde}`,
  outline: 'none', background: '#fff', color: tema.texto
});
const labelStyle = { fontSize: 13, color: '#444' };
const primaryBtnStyle = (tema) => ({
  padding: '8px 14px', border: 'none', borderRadius: 8,
  background: tema.primario, color: '#fff', cursor: 'pointer', fontWeight: 800
});
const secondaryBtnStyle = (tema) => ({
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(16,24,40,0.06)', background: 'transparent', cursor: 'pointer'
});
const closeBtnStyle = (tema) => ({
  padding: 8, borderRadius: 8, background: 'transparent', border: 'none',
  cursor: 'pointer', color: tema.texto
});

export default ModalCreate;
