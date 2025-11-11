import React, { useEffect, useState, useRef } from 'react';
import { FaUserPlus } from 'react-icons/fa';
import { crearUsuario } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // IMPORTAR

const ModalCreate = ({ visible, onClose, onSaveSuccess, tema }) => {
  const { t } = useTranslation(); // INSTANCIAR
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

  // ... (Efecto de Auth no cambia) ...
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
    // Validaciones traducidas
    if (!form.usuario || form.usuario.trim().length < 3) return t('users.validation.userMin3');
    if (!form.password || form.password.length < 4) return t('users.validation.passMin4');
    if (!['administrador', 'trabajador', 'cliente'].includes(form.rol)) return t('users.validation.invalidRole');
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated()) {
      setError(t('common.errors.invalidSession')); // Traducido
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
      await crearUsuario({
        usuario: form.usuario.trim(),
        password: form.password,
        rol: form.rol,
        activo: !!form.activo
      });
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || t('users.errors.create'); // Traducido
      if (status === 401 || status === 403) {
        setError(t('common.errors.sessionExpired')); // Traducido
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
              {/* Textos traducidos */}
              <div style={{ fontWeight: 900, fontSize: 16 }}>{t('users.modal.create.title')}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{t('users.modal.create.subtitle')}</div>
            </div>
          </div>

          <div>
            <button type="button" onClick={onClose} style={closeBtnStyle(tema)}>
              {t('common.close')}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {/* Labels y placeholders traducidos */}
          <label style={{ fontSize: 13, color: '#444' }}>{t('users.fields.user')}</label>
          <input
            value={form.usuario}
            onChange={(e) => setForm(f => ({ ...f, usuario: e.target.value }))}
            placeholder={t('users.fields.user_placeholder')}
            style={inputStyle(tema)}
          />

          <label style={{ fontSize: 13, color: '#444' }}>{t('users.fields.password')}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder={t('users.fields.password_placeholder')}
            style={inputStyle(tema)}
          />

          <label style={{ fontSize: 13, color: '#444' }}>{t('users.fields.role')}</label>
          <select
            value={form.rol}
            onChange={(e) => setForm(f => ({ ...f, rol: e.target.value }))}
            style={{ ...inputStyle(tema), padding: 10 }}
          >
            {/* Opciones traducidas */}
            <option value="administrador">{t('users.roles.admin')}</option>
            <option value="trabajador">{t('users.roles.worker')}</option>
            <option value="cliente">{t('users.roles.client')}</option>
          </select>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm(f => ({ ...f, activo: e.target.checked }))}
            /> {t('common.active')}
          </label>
        </div>

        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          {/* Botones traducidos */}
          <button type="button" onClick={onClose} style={secondaryBtnStyle(tema)}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={loading} style={primaryBtnStyle(tema)}>
            {loading ? t('common.saving') : t('common.create')}
          </button>
        </div>
      </form>
    </div>
  );
};

// ... (Estilos no cambian) ...
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