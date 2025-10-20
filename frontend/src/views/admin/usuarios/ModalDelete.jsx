// src/views/usuarios/ModalDelete.jsx
import React, { useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { eliminarUsuario } from '../../../services/api';

const ModalDelete = ({ visible, onClose, onConfirmSuccess, usuario, tema }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!visible || !usuario) return null;

  const confirm = async () => {
    setError(null);
    setLoading(true);
    try {
      await eliminarUsuario(usuario.id ?? usuario._id);
      if (typeof onConfirmSuccess === 'function') onConfirmSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error al eliminar usuario');
      setLoading(false);
    }
  };

  return (
    <div style={backdropStyle()}>
      <div style={modalStyle(tema)}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: 12, background: '#fff3f3', display: 'grid', placeItems: 'center', color: '#b71c1c' }}>
            <FaExclamationTriangle />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Confirmar eliminación</div>
            <div style={{ color: '#666', marginTop: 6 }}>{`¿Eliminar al usuario "${usuario.nombre}" (ID ${usuario.id ?? usuario._id})? Esta acción no se puede deshacer.`}</div>
            {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={secondaryBtnStyle(tema)}>Cancelar</button>
          <button onClick={confirm} disabled={loading} style={dangerBtnStyle(tema)}>{loading ? 'Eliminando...' : 'Eliminar'}</button>
        </div>
      </div>
    </div>
  );
};

const backdropStyle = () => ({ position: 'fixed', inset: 0, background: 'rgba(8,12,20,0.28)', display: 'grid', placeItems: 'center', zIndex: 8000 });
const modalStyle = (tema) => ({ width: 520, maxWidth: 'calc(100% - 32px)', background: '#fff', padding: 16, borderRadius: 12, border: `1px solid ${tema.borde}`, boxShadow: '0 18px 44px rgba(16,24,40,0.06)' });
const secondaryBtnStyle = (tema) => ({ padding: '8px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(16,24,40,0.06)', cursor: 'pointer' });
const dangerBtnStyle = (tema) => ({ padding: '8px 12px', borderRadius: 8, background: tema.acento, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 });

export default ModalDelete;
