import React, { useEffect, useState, useRef } from 'react';
import { FaEdit } from 'react-icons/fa';
import { actualizarArea } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // IMPORTAR

const ModalEditArea = ({ visible, onClose, onSaveSuccess, area = null, tema }) => {
  const { t } = useTranslation(); // INSTANCIAR
  const [form, setForm] = useState({ nombre: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ... (Efecto de inicialización no cambia) ...
  useEffect(() => {
    if (area) {
      setForm({ nombre: area.nombre ?? '' });
      setError(null);
    } else if (!visible) {
      setForm({ nombre: '' });
      setError(null);
    }
  }, [area, visible]);

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

    if (!isAuthenticated()) {
      setError(t('common.errors.invalidSession')); // Traducido
      try { onClose?.(); } catch {}
      window.location.hash = '#/login';
      return;
    }

    if (!area) {
      setError(t('areas.errors.noAreaSelected')); // Traducido
      return;
    }

    if (!form.nombre || form.nombre.trim().length < 2) {
      setError(t('areas.validation.nameMin2')); // Traducido
      return;
    }

    setLoading(true);
    try {
      const payload = { nombre: form.nombre.trim() };
      const id = typeof area._id === 'object' ? area._id.$oid : area._id;
      await actualizarArea(id, payload);

      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || t('areas.errors.update'); // Traducido
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
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: tema.secundario, display: 'grid', placeItems: 'center', color: '#fff'
            }}>
              <FaEdit />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{t('areas.modal.edit.title')}</div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {t('common.id')}: {area?._id?.$oid || area?._id || '-'}
              </div>
            </div>
          </div>
          <div>
            <button type="button" onClick={onClose} style={closeBtnStyle(tema)}>
              {t('common.close')}
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <input
            value={form.nombre}
            onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder={t('areas.fields.name_placeholder')}
            style={inputStyle(tema)}
          />
        </div>

        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}

        {/* Botones */}
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
  position: 'fixed', inset: 0,
  display: 'grid', placeItems: 'center',
  background: 'rgba(8,12,20,0.3)', zIndex: 8000
});
const modalStyle = (tema) => ({
  width: 460, maxWidth: 'calc(100% - 32px)',
  background: '#fff', padding: 16, borderRadius: 10,
  border: `1px solid ${tema.borde}`,
  boxShadow: '0 18px 44px rgba(16,24,40,0.06)'
});
const inputStyle = (tema) => ({
  padding: 10, borderRadius: 8,
  border: `1px solid ${tema.borde}`,
  outline: 'none', background: '#fff', color: tema.texto
});
const primaryBtnStyle = (tema) => ({
  padding: '8px 14px', border: 'none',
  borderRadius: 8, background: tema.primario,
  color: '#fff', cursor: 'pointer', fontWeight: 800
});
const secondaryBtnStyle = (tema) => ({
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(16,24,40,0.06)',
  background: 'transparent', cursor: 'pointer'
});
const closeBtnStyle = (tema) => ({
  padding: 8, borderRadius: 8,
  background: 'transparent', border: 'none',
  cursor: 'pointer', color: tema.texto
});

export default ModalEditArea;