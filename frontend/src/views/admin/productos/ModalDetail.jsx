import React, { useEffect, useRef } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { isAuthenticated } from '../../../services/auth';

const ModalDetail = ({ visible, onClose, producto, tema }) => {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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

  if (!isAuthenticated()) {
    try { onClose?.(); } catch {}
    window.location.hash = '#/login';
    return null;
  }

  // Normalización de campos para asegurar que no haya errores si vienen con distintas estructuras
  const idValue =
    producto._id?.$oid || producto._id || producto.id || '-';
  const nombre = producto.nombre || '-';
  const precio = producto.precio != null ? `$${Number(producto.precio).toFixed(2)}` : '-';
  const areaId = producto.area_id != null ? producto.area_id : '-';
  const stock = producto.stock != null ? producto.stock : '-';
  const sku = producto.sku || '-';
  const activo = typeof producto.activo === 'boolean'
    ? producto.activo
    : (String(producto.activo) === 'false' ? false : true);
  const createdAt =
    producto.created_at?.$date
      ? new Date(producto.created_at.$date).toLocaleString()
      : producto.created_at
        ? String(producto.created_at)
        : '-';

  return (
    <div style={backdropStyle()}>
      <div style={modalStyle(tema)}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: tema.acento,
                display: 'grid',
                placeItems: 'center',
                color: '#fff'
              }}
            >
              <FaInfoCircle />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{nombre}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{sku}</div>
            </div>
          </div>

          <div>
            <button onClick={onClose} style={closeBtnStyle(tema)}>Cerrar</button>
          </div>
        </div>

        {/* Contenido del detalle */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={labelStyle}>Nombre</div>
            <div style={valueStyle}>{nombre}</div>
          </div>

          <div>
            <div style={labelStyle}>Precio</div>
            <div style={valueStyle}>{precio}</div>
          </div>

          <div>
            <div style={labelStyle}>Área ID</div>
            <div style={valueStyle}>{areaId}</div>
          </div>

          <div>
            <div style={labelStyle}>Stock</div>
            <div style={valueStyle}>{stock}</div>
          </div>

          <div>
            <div style={labelStyle}>SKU</div>
            <div style={valueStyle}>{sku}</div>
          </div>

          <div>
            <div style={labelStyle}>Estado</div>
            <div style={valueStyle}>{activo ? 'Activo' : 'Inactivo'}</div>
          </div>

          <div>
            <div style={labelStyle}>Creado el</div>
            <div style={valueStyle}>{createdAt}</div>
          </div>

          <div>
            <div style={labelStyle}>ID</div>
            <div style={{ ...valueStyle, wordBreak: 'break-all' }}>{idValue}</div>
          </div>
        </div>

        {/* Botón inferior */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={primaryBtnStyle(tema)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

/* ==== Estilos reutilizados ==== */
const backdropStyle = () => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(8,12,20,0.28)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 8000
});

const modalStyle = (tema) => ({
  width: 560,
  maxWidth: 'calc(100% - 32px)',
  background: '#fff',
  padding: 16,
  borderRadius: 10,
  border: `1px solid ${tema.borde}`,
  boxShadow: '0 12px 32px rgba(16,24,40,0.06)'
});

const closeBtnStyle = (tema) => ({
  padding: 8,
  borderRadius: 8,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: tema.texto
});

const primaryBtnStyle = (tema) => ({
  padding: '8px 14px',
  borderRadius: 8,
  background: tema.primario,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800
});

const labelStyle = { fontSize: 12, color: '#888' };
const valueStyle = { fontWeight: 800, fontSize: 14 };

export default ModalDetail;
