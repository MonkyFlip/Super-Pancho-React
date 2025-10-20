// VentaForm.jsx
import React, { useEffect, useState } from 'react';
import { temas } from '../../../styles/temas';

/**
 * VentaForm
 * Props:
 * - initial: objeto para edición (opcional)
 * - onSubmit(payload)
 * - onCancel()
 * - onQuickStatusChange(row, campo, valor) optional callback to update status quickly
 *
 * Simplificado: el formulario permite:
 * - seleccionar cliente (texto libre o id)
 * - agregar items mínimos: [{ sku, nombre, cantidad, precio }]
 * - total calculado automáticamente
 * - estadoPago, estadoEnvio
 *
 * Nota: idealmente el selector de productos/cliente será un componente autocomplete conectado al backend.
 */
const THEME_KEY = 'app_theme_selected';

const VentaForm = ({ initial = null, onSubmit = () => {}, onCancel = () => {}, onQuickStatusChange }) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const [cliente, setCliente] = useState(initial?.cliente?.nombre ?? initial?.cliente ?? '');
  const [items, setItems] = useState(initial?.items ? initial.items.slice() : [{ sku: '', nombre: '', cantidad: 1, precio: 0 }]);
  const [estadoPago, setEstadoPago] = useState(initial?.estadoPago || 'pendiente');
  const [estadoEnvio, setEstadoEnvio] = useState(initial?.estadoEnvio || 'pendiente');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCliente(initial?.cliente?.nombre ?? initial?.cliente ?? '');
    setItems(initial?.items ? initial.items.slice() : [{ sku: '', nombre: '', cantidad: 1, precio: 0 }]);
    setEstadoPago(initial?.estadoPago || 'pendiente');
    setEstadoEnvio(initial?.estadoEnvio || 'pendiente');
    setError('');
  }, [initial]);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    background: tema.secundario,
    color: tema.texto,
    boxSizing: 'border-box'
  };

  const total = items.reduce((acc, it) => acc + (Number(it.cantidad || 0) * Number(it.precio || 0)), 0);

  const addItem = () => setItems(prev => [...prev, { sku: '', nombre: '', cantidad: 1, precio: 0 }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, key, value) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!cliente) { setError('Selecciona o ingresa un cliente'); return; }
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    for (const it of items) {
      if (!it.nombre || !it.precio || !it.cantidad) { setError('Completa los campos de los items'); return; }
    }

    const payload = { cliente, items, estadoPago, estadoEnvio, total };
    try {
      setSaving(true);
      await onSubmit(payload);
    } catch (err) {
      console.error('VentaForm submit error', err);
      setError(err?.message || 'Error al guardar la venta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 13, color: tema.borde }}>Cliente</label>
        <input style={inputStyle} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre o id del cliente" />
      </div>

      <div>
        <label style={{ fontSize: 13, color: tema.borde }}>Items</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 40px', gap: 8, alignItems: 'center' }}>
              <input placeholder="SKU" value={it.sku} onChange={e => updateItem(idx, 'sku', e.target.value)} style={inputStyle} />
              <input placeholder="Nombre" value={it.nombre} onChange={e => updateItem(idx, 'nombre', e.target.value)} style={inputStyle} />
              <input type="number" min="1" placeholder="Cantidad" value={it.cantidad} onChange={e => updateItem(idx, 'cantidad', Number(e.target.value))} style={inputStyle} />
              <input type="number" min="0" step="0.01" placeholder="Precio" value={it.precio} onChange={e => updateItem(idx, 'precio', Number(e.target.value))} style={inputStyle} />
              <button type="button" onClick={() => removeItem(idx)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }}>✕</button>
            </div>
          ))}

          <div>
            <button type="button" onClick={addItem} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tema.primario, color: '#fff' }}>Agregar item</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: tema.borde }}>Estado pago</label>
          <select style={inputStyle} value={estadoPago} onChange={e => setEstadoPago(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="reembolsado">Reembolsado</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: tema.borde }}>Estado envío</label>
          <select style={inputStyle} value={estadoEnvio} onChange={e => setEstadoEnvio(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="enviado">Enviado</option>
            <option value="entregado">Entregado</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 14, color: tema.borde }}>Total</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: tema.texto }}>$ {total.toFixed(2)}</div>
      </div>

      {error && <div style={{ color: '#a33' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }}>Cancelar</button>
        <button type="submit" disabled={saving} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: tema.primario, color: '#fff', fontWeight: 700 }}>{saving ? 'Guardando...' : 'Guardar venta'}</button>
      </div>
    </form>
  );
};

export default VentaForm;
