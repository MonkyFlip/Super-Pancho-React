// src/views/usuarios/ModalDetail.jsx
import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const ModalDetail = ({ visible, onClose, usuario, tema }) => {
  if (!visible || !usuario) return null;

  return (
    <div style={backdropStyle()}>
      <div style={modalStyle(tema)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tema.acento, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <FaInfoCircle />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{usuario.nombre}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{usuario.rol}</div>
            </div>
          </div>

          <div>
            <button onClick={onClose} style={closeBtnStyle(tema)}>Cerrar</button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Email</div>
            <div style={{ fontWeight: 800 }}>{usuario.email}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Teléfono</div>
            <div style={{ fontWeight: 800 }}>{usuario.telefono ?? '-'}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Estado</div>
            <div style={{ fontWeight: 800 }}>{usuario.activo ? 'Activo' : 'Inactivo'}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#888' }}>ID</div>
            <div style={{ fontWeight: 800 }}>{usuario.id ?? usuario._id}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={primaryBtnStyle(tema)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const backdropStyle = () => ({ position: 'fixed', inset: 0, background: 'rgba(8,12,20,0.28)', display: 'grid', placeItems: 'center', zIndex: 8000 });
const modalStyle = (tema) => ({ width: 640, maxWidth: 'calc(100% - 32px)', background: '#fff', padding: 18, borderRadius: 12, border: `1px solid ${tema.borde}`, boxShadow: '0 18px 44px rgba(16,24,40,0.06)' });
const closeBtnStyle = (tema) => ({ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: tema.texto });
const primaryBtnStyle = (tema) => ({ padding: '8px 14px', borderRadius: 8, background: tema.primario, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 });

export default ModalDetail;
