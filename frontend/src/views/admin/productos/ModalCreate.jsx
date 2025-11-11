import React, { useEffect, useState, useRef } from 'react';
import { FaPlus } from 'react-icons/fa';
import { crearProducto } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';
import { useTranslation } from 'react-i18next'; // 1. IMPORTAR

const ModalCreate = ({ visible, onClose, onSaveSuccess, tema }) => {
  const { t } = useTranslation(); // 2. INSTANCIAR EL HOOK

  const [form, setForm] = useState({
    nombre: '',
    precio: '',
    area_id: '',
    stock: '',
    sku: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!visible) {
      setForm({
        nombre: '',
        precio: '',
        area_id: '',
        stock: '',
        sku: ''
      });
      setError(null);
    }
  }, [visible]);

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

  const validate = () => {
    // NOTA: Los mensajes de error (ej. 'mínimo 2 caracteres') también deberían ser traducidos.
    // Te recomiendo agregar llaves como 'common.validation.min2' a tu JSON.
    if (!form.nombre || form.nombre.trim().length < 2) return `${t('common.name')}: ${t('common.validation.min2', 'mínimo 2 caracteres')}`;
    if (!form.precio || isNaN(form.precio) || Number(form.precio) <= 0) return `${t('common.price')}: ${t('common.validation.invalid', 'inválido')}`;
    if (!form.area_id || isNaN(form.area_id)) return `${t('products.fields.area')}: ${t('common.validation.mustBeNumber', 'debe ser un número válido')}`;
    if (!form.stock || isNaN(form.stock) || Number(form.stock) < 0) return `${t('common.stock')}: ${t('common.validation.invalid', 'inválido')}`;
    if (!form.sku || form.sku.trim().length < 3) return `${t('common.sku')}: ${t('common.validation.min3', 'mínimo 3 caracteres')}`;
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    // NOTA: Estos mensajes de error también deberían estar en tu JSON (ej. 'common.errors.invalidSession')
    if (!isAuthenticated()) {
      setError(t('common.errors.invalidSession', 'Sesión no válida. Por favor, inicia sesión de nuevo.'));
      window.location.hash = '#/login';
      return;
    }

    const vErr = validate();
    if (vErr) {
      setError(vErr);
      return;
    }

    setLoading(true);
    try {
      await crearProducto({
        nombre: form.nombre.trim(),
        precio: parseFloat(form.precio),
        area_id: parseInt(form.area_id),
        stock: parseInt(form.stock),
        sku: form.sku.trim()
      });
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err.message || t('products.errors.create', 'Error al crear producto');
      
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
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tema.primario, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <FaPlus />
            </div>
            <div>
              {/* 3. TEXTOS REEMPLAZADOS */}
              <div style={{ fontWeight: 900, fontSize: 16 }}>{t('products.modal.create.title')}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{t('products.modal.create.subtitle')}</div>
            </div>
          </div>

          <div>
            <button type="button" onClick={onClose} style={closeBtnStyle(tema)}>
              {t('common.close')}
            </button>
          </div>
        </div>

        {/* Campos del formulario */}
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <label style={labelStyle}>{t('common.name')}</label>
          <input
            value={form.nombre}
            onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder={t('products.fields.name.placeholder')}
            style={inputStyle(tema)}
          />

          <label style={labelStyle}>{t('common.price')}</label>
          <input
            type="number"
            step="0.01"
            value={form.precio}
            onChange={(e) => setForm(f => ({ ...f, precio: e.target.value }))}
            placeholder={t('products.fields.price.placeholder')}
            style={inputStyle(tema)}
          />

          <label style={labelStyle}>{t('products.fields.area')}</label>
          <input
            type="number"
            value={form.area_id}
            onChange={(e) => setForm(f => ({ ...f, area_id: e.target.value }))}
            placeholder={t('products.fields.area.placeholder')}
            style={inputStyle(tema)}
          />

          <label style={labelStyle}>{t('common.stock')}</label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))}
            placeholder={t('products.fields.stock.placeholder')}
            style={inputStyle(tema)}
          />

          <label style={labelStyle}>{t('common.sku')}</label>
          <input
            value={form.sku}
            onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))}
            placeholder={t('products.fields.sku.placeholder')}
            style={inputStyle(tema)}
          />
        </div>

        {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle(tema)}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={loading} style={primaryBtnStyle(tema)}>
            {loading ? t('common.saving') : t('common.create')}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ==== Estilos (sin cambios) ==== */
const backdropStyle = () => ({
  position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
  background: 'rgba(8,12,20,0.3)', zIndex: 8000
});
const modalStyle = (tema) => ({
  width: 520, maxWidth: 'calc(100% - 32px)', background: '#fff',
  padding: 18, borderRadius: 12, border: `1px solid ${tema.borde}`,
  boxShadow: '0 20px 48px rgba(16,24,40,0.08)'
});
const inputStyle = (tema) => ({
  padding: 10, borderRadius: 8, border: `1px solid ${tema.borde}`,
  outline: 'none', background: '#fff', color: tema.texto
});
const labelStyle = { fontSize: 13, color: '#444' };
const primaryBtnStyle = (tema) => ({
  padding: '8px 14px', border: 'none', borderRadius: 8,
  background: tema.primario, color: '#fff', cursor: 'pointer', fontWeight: 800
});
const secondaryBtnStyle = (tema) => ({
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(16,24,40,0.06)', background: 'transparent', cursor: 'pointer'
});
const closeBtnStyle = (tema) => ({
  padding: 8, borderRadius: 8, background: 'transparent', border: 'none',
  cursor: 'pointer', color: tema.texto
});

export default ModalCreate;