import React, { useEffect, useRef } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // IMPORTAR

const ModalDetail = ({ visible, onClose, usuario, tema }) => {
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

  if (!visible || !usuario) return null;

  if (!isAuthenticated()) {
    try { onClose?.(); } catch {}
    window.location.hash = '#/login';
    return null;
  }

  // ... (Normalizaciones no cambian) ...
  const idValue = usuario.id ?? usuario._id ?? usuario._oid ?? usuario._id?.$oid ?? '';
  const usuarioKey = usuario.usuario_key ?? (usuario.usuario ? String(usuario.usuario).toLowerCase() : '');
  const rol = usuario.rol ?? usuario.role ?? '';
  const lastLogin = usuario.last_login ? String(usuario.last_login) : '-';
  const activo = typeof usuario.activo === 'boolean' ? usuario.activo : (String(usuario.activo) === 'false' ? false : true);

  return (
    <div style={backdropStyle()}>
      <div style={modalStyle(tema)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tema.acento, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <FaInfoCircle />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {/* Dato (con fallback traducido) */}
                {usuario.usuario ?? usuario.name ?? usuario.usuario_key ?? t('users.user')}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>{rol}</div>
            </div>
          </div>

          <div>
            <button onClick={onClose} style={closeBtnStyle(tema)}>
              {t('common.close')}
            </button>
          </div>
        </div>

        {/* Labels traducidas */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>{t('users.fields.user')}</div>
            <div style={{ fontWeight: 800 }}>{usuario.usuario ?? '-'}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>{t('users.fields.key')}</div>
            <div style={{ fontWeight: 800, wordBreak: 'break-all' }}>{usuarioKey || '-'}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>{t('users.fields.role')}</div>
            <div style={{ fontWeight: 800 }}>{rol || '-'}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>{t('common.status')}</div>
            <div style={{ fontWeight: 800 }}>
              {/* Valor traducido */}
              {activo ? t('common.active') : t('common.inactive')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>{t('users.fields.last_login')}</div>
            <div style={{ fontWeight: 800 }}>{lastLogin}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>{t('common.id')}</div>
            <div style={{ fontWeight: 800 }}>{idValue}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
  position: 'fixed', inset: 0, background: 'rgba(8,12,20,0.28)', display: 'grid', placeItems: 'center', zIndex: 8000
});
const modalStyle = (tema) => ({
  width: 560, maxWidth: 'calc(100% - 32px)', background: '#fff', padding: 16, borderRadius: 10,
  border: `1px solid ${tema.borde}`, boxShadow: '0 12px 32px rgba(16,24,40,0.06)'
});
const closeBtnStyle = (tema) => ({ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: tema.texto });
const primaryBtnStyle = (tema) => ({ padding: '8px 14px', borderRadius: 8, background: tema.primario, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 });

export default ModalDetail;