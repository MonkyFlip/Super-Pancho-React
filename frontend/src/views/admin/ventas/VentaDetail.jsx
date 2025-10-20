// VentaDetail.jsx
import React from 'react';
import { temas } from '../../../styles/temas';

/**
 * VentaDetail
 * Props:
 * - venta: objeto de venta
 * - onChangeStatus(venta, campo, valor) optional
 *
 * Presentación de la venta y botones rápidos para cambiar estados.
 */
const THEME_KEY = 'app_theme_selected';

const VentaDetail = ({ venta, onChangeStatus }) => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  if (!venta) return <div style={{ color: tema.borde }}>Selecciona una venta para ver su detalle.</div>;

  const total = (venta.items || []).reduce((acc, it) => acc + (Number(it.cantidad || 0) * Number(it.precio || 0)), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
      <div style={{ borderRadius: 10, padding: 12, border: `1px solid ${tema.borde}`, background: tema.secundario }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: tema.borde }}>Pedido</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: tema.texto }}>{venta.idPedido ?? venta.id}</div>
            <div style={{ fontSize: 13, color: tema.borde }}>{new Date(venta.fecha ?? venta.createdAt).toLocaleString()}</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: tema.borde }}>Total</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: tema.texto }}>$ {total.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: tema.borde }}>Cliente</div>
          <div style={{ fontWeight: 700, color: tema.texto }}>{venta.cliente?.nombre ?? venta.cliente ?? '—'}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: tema.borde }}>Items</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(venta.items || []).map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: tema.texto }}>{it.nombre} <small style={{ color: tema.borde }}>({it.sku || '—'})</small></div>
                  <div style={{ fontSize: 13, color: tema.borde }}>{it.cantidad} × $ {Number(it.precio || 0).toFixed(2)}</div>
                </div>
                <div style={{ fontWeight: 700, color: tema.texto }}>$ {(Number(it.cantidad || 0) * Number(it.precio || 0)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside style={{ borderRadius: 10, padding: 12, border: `1px solid ${tema.borde}`, background: tema.secundario }}>
        <div>
          <div style={{ fontSize: 13, color: tema.borde }}>Estado de pago</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={() => onChangeStatus && onChangeStatus(venta, 'estadoPago', 'pagado')} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: '#1f9d55', color: '#fff' }}>Marcar pagado</button>
            <button onClick={() => onChangeStatus && onChangeStatus(venta, 'estadoPago', 'reembolsado')} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }}>Reembolsar</button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: tema.borde }}>Estado de envío</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexDirection: 'column' }}>
            <button onClick={() => onChangeStatus && onChangeStatus(venta, 'estadoEnvio', 'enviado')} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: '#0b6cff', color: '#fff' }}>Marcar enviado</button>
            <button onClick={() => onChangeStatus && onChangeStatus(venta, 'estadoEnvio', 'entregado')} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }}>Marcar entregado</button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: tema.borde }}>Acciones</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexDirection: 'column' }}>
            <button onClick={() => alert('Generar factura: no implementado')} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario }}>Generar factura</button>
            <button onClick={() => alert('Imprimir: no implementado')} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario }}>Imprimir</button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default VentaDetail;
