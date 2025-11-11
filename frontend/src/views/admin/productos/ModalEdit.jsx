import React, { useEffect, useState, useRef } from 'react';
import { FaEdit } from 'react-icons/fa';
import { actualizarProducto } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // 1. IMPORTAR

const ModalEditProducto = ({ visible, onClose, onSaveSuccess, producto = null, tema }) => {
  const { t } = useTranslation(); // 2. INSTANCIAR
  const [form, setForm] = useState({ nombre: '', precio: '', area_id: '', stock: '', sku: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Inicializar el formulario (sin cambios de lógica)
  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre ?? '',
        precio: producto.precio ?? '',
        area_id: producto.area_id ?? '',
        stock: producto.stock ?? '',
        sku: producto.sku ?? ''
      });
      setError(null);
    } else if (!visible) {
      setForm({ nombre: '', precio: '', area_id: '', stock: '', sku: '' });
      setError(null);
    }
  }, [producto, visible]);

  // Detectar cierre de sesión (sin cambios de lógica)
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

    // 3. TEXTOS DE ERROR Y VALIDACIÓN
    if (!isAuthenticated()) {
      setError(t('common.errors.invalidSession', 'Sesión no válida. Por favor inicia sesión de nuevo.'));
      try { onClose?.(); } catch {}
      window.location.hash = '#/login';
      return;
    }

    if (!producto) {
      setError(t('products.errors.noProductSelected', 'Producto no seleccionado.'));
      return;
    }

    // Validaciones básicas
    if (!form.nombre || form.nombre.trim().length < 2) {
      setError(t('products.validation.nameMin2', 'El nombre del producto debe tener al menos 2 caracteres.'));
      return;
    }
    if (form.precio <= 0) {
      setError(t('products.validation.pricePositive', 'El precio debe ser mayor que 0.'));
      return;
    }
    if (!form.sku || form.sku.trim().length < 3) {
      setError(t('products.validation.skuMin3', 'El SKU debe tener al menos 3 caracteres.'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        precio: parseFloat(form.precio),
        area_id: parseInt(form.area_id),
        stock: parseInt(form.stock),
        sku: form.sku.trim()
      };

      const id = typeof producto._id === 'object' ? producto._id.$oid : producto._id;
      await actualizarProducto(id, payload);
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || t('products.errors.update', 'Error al actualizar producto');
      
      if (status === 401 || status === 403) {
        setError(t('common.errors.sessionExpired', 'Sesión expirada o no autorizada. Redirigiendo a login...'));
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
        {/* 4. TEXTOS DE ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tema.secundario, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <FaEdit />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{t('products.modal.edit.title')}</div>
              {/* Esto es un dato, no se traduce */}
              <div style={{ fontSize: 13, color: '#666' }}>{producto?.nombre}</div>
            </div>
          </div>
          <div>
            <button type="button" onClick={onClose} style={closeBtnStyle(tema)}>
              {t('common.close')}
            </button>
          </div>
        </div>

        {/* 5. PLACEHOLDERS DEL FORMULARIO */}
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <input
            value={form.nombre}
            onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder={t('products.fields.name.placeholder')}
            style={inputStyle(tema)}
          />

          <input
            type="number"
            step="0.01"
            value={form.precio}
            onChange={(e) => setForm(f => ({ ...f, precio: e.target.value }))}
            placeholder={t('products.fields.price.placeholder')}
            style={inputStyle(tema)}
          />

          <input
            type="number"
            value={form.area_id}
            onChange={(e) => setForm(f => ({ ...f, area_id: e.target.value }))}
            placeholder={t('products.fields.area.placeholder')}
            style={inputStyle(tema)}
          />

          <input
            type="number"
            value={form.stock}
            onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))}
            placeholder={t('products.fields.stock.placeholder')}
            style={inputStyle(tema)}
          />

          <input
            value={form.sku}
            onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))}
            placeholder={t('products.fields.sku.placeholder')}
            style={inputStyle(tema)}
          />
        </div>

        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}

        {/* 6. TEXTOS DE BOTONES DE ACCIÓN */}
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

// Estilos (sin cambios)
const backdropStyle = () => ({
  position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(8,12,20,0.3)', zIndex: 8000
});
const modalStyle = (tema) => ({
  width: 560, maxWidth: 'calc(100% - 32px)', background: '#fff', padding: 16,
  borderRadius: 10, border: `1px solid ${tema.borde}`, boxShadow: '0 18px 44px rgba(16,24,40,0.06)'
});
const inputStyle = (tema) => ({
  padding: 10, borderRadius: 8, border: `1px solid ${tema.borde}`,
  outline: 'none', background: '#fff', color: tema.texto
});
const primaryBtnStyle = (tema) => ({
  padding: '8px 14px', border: 'none', borderRadius: 8,
  background: tema.primario, color: '#fff', cursor: 'pointer', fontWeight: 800
});
const secondaryBtnStyle = (tema) => ({
  padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(16,24,40,0.06)',
  background: 'transparent', cursor: 'pointer'
});
const closeBtnStyle = (tema) => ({
  padding: 8, borderRadius: 8, background: 'transparent',
  border: 'none', cursor: 'pointer', color: tema.texto
});

export default ModalEditProducto;