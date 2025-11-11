import React, { useEffect, useRef } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // IMPORTAR

const ModalDetail = ({ visible, onClose, area, tema }) => {
  const { t } = useTranslation(); // INSTANCIAR
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

  if (!isAuthenticated()) {
    try { onClose?.(); } catch {}
    window.location.hash = '#/login';
    return null;
  }

  // ... (Normalización no cambia) ...
  const idValue = area._id?.$oid || area._id || area.id || '-';
  const nombre = area.nombre || '-';

  return (
    <div style={backdropStyle()}>
      <div style={modalStyle(tema)}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: tema.acento, display: 'grid',
              placeItems: 'center', color: '#fff'
            }}>
              <FaInfoCircle />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{nombre}</div>
            </div>
          </div>

          <div>
            <button onClick={onClose} style={closeBtnStyle(tema)}>
              {t('common.close')}
            </button>
          </div>
        </div>

        {/* Cuerpo del detalle */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          <div>
            <div style={labelStyle}>{t('common.name')}</div>
            <div style={valueStyle}>{nombre}</div>
          </div>

          <div>
            <div style={labelStyle}>{t('common.id')}</div>
            <div style={{ ...valueStyle, wordBreak: 'break-all' }}>{idValue}</div>
          </div>
        </div>

        {/* Pie con botón */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={primaryBtnStyle(tema)}>
            {t('common.close')}
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
  width: 560, maxWidth: 'calc(100% - 32px)',
  background: '#fff', padding: 16, borderRadius: 10,
  border: `1px solid ${tema.borde}`,
  boxShadow: '0 12px 32px rgba(16,24,40,0.06)'
});
const closeBtnStyle = (tema) => ({
  padding: 8, borderRadius: 8, background: 'transparent',
  border: 'none', cursor: 'pointer', color: tema.texto
});
const primaryBtnStyle = (tema) => ({
  padding: '8px 14px', borderRadius: 8,
  background: tema.primario, color: '#fff',
  border: 'none', cursor: 'pointer', fontWeight: 800
});
const labelStyle = { fontSize: 12, color: '#888' };
const valueStyle = { fontWeight: 800, fontSize: 14 };

export default ModalDetail;