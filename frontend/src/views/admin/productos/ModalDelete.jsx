import React, { useState, useRef, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { eliminarProducto } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';

const ModalDeleteProducto = ({ visible, onClose, onConfirmSuccess, producto, tema }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Cerrar modal si la sesión se invalida en otra pestaña
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

  if (!visible || !producto) return null;

  const confirm = async () => {
    setError(null);

    if (!isAuthenticated()) {
      setError('Sesión no válida. Por favor inicia sesión de nuevo.');
      try { onClose?.(); } catch {}
      window.location.hash = '#/login';
      return;
    }

    setLoading(true);
    try {
      // Algunos productos pueden tener el _id como objeto {$oid: "..."}
      const id = typeof producto._id === 'object' ? producto._id.$oid : producto._id;
      await eliminarProducto(id);

      if (typeof onConfirmSuccess === 'function') onConfirmSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || 'Error al eliminar producto';
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
            <div style={{ fontWeight: 900, fontSize: 16 }}>Confirmar eliminación</div>
            <div style={{ color: '#666', marginTop: 6 }}>
              {`¿Eliminar el producto "${producto.nombre}" (ID ${typeof producto._id === 'object' ? producto._id.$oid : producto._id})? Esta acción no se puede deshacer.`}
            </div>
            {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={secondaryBtnStyle(tema)}>Cancelar</button>
          <button onClick={confirm} disabled={loading} style={dangerBtnStyle(tema)}>
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Estilos
const backdropStyle = () => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(8,12,20,0.28)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 8000
});

const modalStyle = (tema) => ({
  width: 520,
  maxWidth: 'calc(100% - 32px)',
  background: '#fff',
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${tema.borde}`,
  boxShadow: '0 18px 44px rgba(16,24,40,0.06)'
});

const secondaryBtnStyle = (tema) => ({
  padding: '8px 12px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid rgba(16,24,40,0.06)',
  cursor: 'pointer'
});

const dangerBtnStyle = (tema) => ({
  padding: '8px 12px',
  borderRadius: 8,
  background: tema.acento,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800
});

export default ModalDeleteProducto;
