import React, { useEffect, useState, useRef } from 'react';
import { FaEdit } from 'react-icons/fa';
import { actualizarUsuario } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // IMPORTAR

const ModalEdit = ({ visible, onClose, onSaveSuccess, usuario = null, tema }) => {
  const { t } = useTranslation(); // INSTANCIAR
  const [form, setForm] = useState({ usuario: '', password: '', rol: '', activo: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ... (Efecto de inicialización de form no cambia) ...
  useEffect(() => {
    if (usuario) {
      setForm({
        usuario: usuario.usuario ?? usuario.name ?? '',
        password: '',
        rol: usuario.rol ?? usuario.role ?? '',
        activo: typeof usuario.activo === 'boolean' ? usuario.activo : true
      });
      setError(null);
    } else if (!visible) {
      setForm({ usuario: '', password: '', rol: '', activo: true });
      setError(null);
    }
  }, [usuario, visible]);

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

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    // Errores traducidos
    if (!isAuthenticated()) {
      setError(t('common.errors.invalidSession'));
      try { onClose?.(); } catch {}
      window.location.hash = '#/login';
      return;
    }

    if (!usuario) {
      setError(t('users.errors.noUserSelected'));
      return;
    }

    // Validaciones traducidas
    if (!form.usuario || form.usuario.trim().length < 3) {
      setError(t('users.validation.userMin3'));
      return;
    }
    if (form.password && form.password.length < 4) {
      setError(t('users.validation.passMin4_if_provided'));
      return;
    }
    if (!form.rol || !['administrador', 'trabajador', 'cliente'].includes(String(form.rol))) {
      setError(t('users.validation.invalidRole'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        usuario: form.usuario.trim(),
        rol: form.rol,
        activo: Boolean(form.activo)
      };
      if (form.password && form.password.length > 0) payload.password = form.password;

      const id = usuario.id ?? usuario._id;
      await actualizarUsuario(id, payload);
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || t('users.errors.update'); // Traducido
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
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tema.secundario, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <FaEdit />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {t('users.modal.edit.title')}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>{usuario?.usuario ?? usuario?.name ?? usuario?.usuario_key}</div>
            </div>
          </div>

          <div>
            <button type="button" onClick={onClose} style={closeBtnStyle(tema)}>
              {t('common.close')}
            </button>
          </div>
        </div>

        {/* Placeholders y selects traducidos */}
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <input
            value={form.usuario}
            onChange={(e) => setForm(f => ({ ...f, usuario: e.target.value }))}
            placeholder={t('users.fields.user')}
            style={inputStyle(tema)}
            autoComplete="username"
          />

          <input
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder={t('users.fields.password_edit_placeholder')}
            style={inputStyle(tema)}
            type="password"
            autoComplete="new-password"
          />

          <select value={form.rol} onChange={(e) => setForm(f => ({ ...f, rol: e.target.value }))} style={selectStyle(tema)}>
            <option value="">{t('users.fields.role_placeholder')}</option>
            <option value="administrador">{t('users.roles.admin')}</option>
            <option value="trabajador">{t('users.roles.worker')}</option>
            <option value="cliente">{t('users.roles.client')}</option>
          </select>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm(f => ({ ...f, activo: e.target.checked }))} /> 
            {t('common.active')}
          </label>
        </div>

        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}

        {/* Botones traducidos */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle(tema)} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={loading} style={primaryBtnStyle(tema)}>
            {loading ? t('common.saving') : t('common.save_changes')}
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
  width: 560, maxWidth: 'calc(100% - 32px)', background: '#fff', padding: 16, borderRadius: 10, border: `1px solid ${tema.borde}`, boxShadow: '0 18px 44px rgba(16,24,40,0.06)'
});
const inputStyle = (tema) => ({ padding: 10, borderRadius: 8, border: `1px solid ${tema.borde}`, outline: 'none', background: '#fff', color: tema.texto });
const selectStyle = (tema) => ({ padding: 10, borderRadius: 8, border: `1px solid ${tema.borde}`, background: '#fff', color: tema.texto });
const primaryBtnStyle = (tema) => ({ padding: '8px 14px', border: 'none', borderRadius: 8, background: tema.primario, color: '#fff', cursor: 'pointer', fontWeight: 800 });
const secondaryBtnStyle = (tema) => ({ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(16,24,40,0.06)', background: 'transparent', cursor: 'pointer' });
const closeBtnStyle = (tema) => ({ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: tema.texto });

export default ModalEdit;