import React, { useState, useRef, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { eliminarArea } from '../../../services/api'; 
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // IMPORTAR

const ModalDeleteArea = ({ visible, onClose, onConfirmSuccess, area, tema }) => {
  const { t } = useTranslation(); // INSTANCIAR
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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

  if (!visible || !area) return null;

  const confirm = async () => {
    setError(null);

    if (!isAuthenticated()) {
      setError(t('common.errors.invalidSession')); // Traducido
      try { onClose?.(); } catch {}
      window.location.hash = '#/login';
      return;
    }

    setLoading(true);
    try {
      const id = typeof area._id === 'object' ? area._id.$oid : area._id;
      await eliminarArea(id);
      if (typeof onConfirmSuccess === 'function') onConfirmSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || t('areas.errors.delete'); // Traducido
      
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

  const areaId = typeof area._id === 'object' ? area._id.$oid : area._id;

  return (
    <div style={backdropStyle()}>
      <div style={modalStyle(tema)}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 54, height: 54, borderRadius: 12,
            background: '#fff3f3', display: 'grid',
            placeItems: 'center', color: '#b71c1c'
          }}>
            <FaExclamationTriangle />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>
              {t('areas.modal.delete.title')}
            </div>
            <div style={{ color: '#666', marginTop: 6 }}>
              {/* Interpolación traducida */}
              {t('areas.modal.delete.description', { name: area.nombre, id: areaId })}
            </div>
            {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={secondaryBtnStyle(tema)}>
            {t('common.cancel')}
          </button>
          <button onClick={confirm} disabled={loading} style={dangerBtnStyle(tema)}>
            {loading ? t('common.deleting') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ... (Estilos no cambian) ...
const backdropStyle = () => ({
  position: 'fixed', inset: 0,
  background: 'rgba(8,12,20,0.28)',
  display: 'grid', placeItems: 'center', zIndex: 8000
});
const modalStyle = (tema) => ({
  width: 520, maxWidth: 'calc(100% - 32px)',
  background: '#fff', padding: 16, borderRadius: 12,
  border: `1px solid ${tema.borde}`,
  boxShadow: '0 18px 44px rgba(16,24,40,0.06)'
});
const secondaryBtnStyle = (tema) => ({
  padding: '8px 12px', borderRadius: 8,
  background: 'transparent',
  border: '1px solid rgba(16,24,40,0.06)',
  cursor: 'pointer'
});
const dangerBtnStyle = (tema) => ({
  padding: '8px 12px', borderRadius: 8,
  background: tema.acento,
  color: '#fff', border: 'none',
  cursor: 'pointer', fontWeight: 800
});

export default ModalDeleteArea;