// src/views/admin/configuracion/ConfiguracionGeneral.jsx
import React, { useEffect, useState } from 'react';
import { temas } from '../../../styles/temas';
import { getConfiguracion, guardarConfiguracion } from '../../../services/api';

const THEME_KEY = 'app_theme_selected';

/**
 * ConfiguracionGeneral
 * - Formulario simple para parámetros globales: moneda, impuestos, perPage (aunque en CRUD fijo = 10),
 *   métodos de pago habilitados, opciones de facturación y permitir registro público.
 * - Lee/guarda usando endpoints getConfiguracion / guardarConfiguracion
 * - Respeta el tema almacenado
 */
const ConfiguracionGeneral = () => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [moneda, setMoneda] = useState('MXN');
  const [impuestoPorc, setImpuestoPorc] = useState(16);
  const [perPage, setPerPage] = useState(10);
  const [metodosPago, setMetodosPago] = useState({ efectivo: true, tarjeta: true, transferencia: false });
  const [facturacion, setFacturacion] = useState({ habilitada: false, proveedor: '' });
  const [registroPublico, setRegistroPublico] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getConfiguracion();
        const conf = res?.data ?? {};
        if (!conf) return;
        setMoneda(conf.moneda ?? 'MXN');
        setImpuestoPorc(conf.impuestoPorc ?? 16);
        setPerPage(conf.perPage ?? 10);
        setMetodosPago(conf.metodosPago ?? { efectivo: true, tarjeta: true, transferencia: false });
        setFacturacion(conf.facturacion ?? { habilitada: false, proveedor: '' });
        setRegistroPublico(conf.registroPublico ?? true);
      } catch (err) {
        console.error('getConfiguracion error', err);
        setError('No se pudo cargar configuración');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setError('');
    setOk('');
    // validaciones básicas
    if (!moneda) { setError('Selecciona una moneda'); return; }
    if (isNaN(Number(impuestoPorc)) || Number(impuestoPorc) < 0) { setError('Impuesto inválido'); return; }
    if (!Number.isInteger(Number(perPage)) || Number(perPage) <= 0) { setError('perPage debe ser entero positivo'); return; }

    const payload = {
      moneda,
      impuestoPorc: Number(impuestoPorc),
      perPage: Number(perPage),
      metodosPago,
      facturacion,
      registroPublico
    };

    try {
      setSaving(true);
      await guardarConfiguracion(payload);
      setOk('Configuración guardada correctamente');
      setTimeout(() => setOk(''), 3000);
    } catch (err) {
      console.error('guardarConfiguracion error', err);
      setError('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h2 style={{ margin: 0, color: tema.texto }}>Configuración general</h2>
      <div style={{ color: tema.borde, marginTop: 8, marginBottom: 12 }}>Ajustes operativos y parámetros globales del sistema</div>

      {loading ? <div style={{ color: tema.borde }}>Cargando...</div> : (
        <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: tema.borde }}>Moneda</label>
              <select value={moneda} onChange={e => setMoneda(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }}>
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, color: tema.borde }}>Impuesto (%)</label>
              <input type="number" value={impuestoPorc} onChange={e => setImpuestoPorc(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: tema.borde }}>Filas por página (UI)</label>
              <input type="number" value={perPage} onChange={e => setPerPage(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }} />
              <div style={{ fontSize: 12, color: tema.borde, marginTop: 6 }}>Nota: los CRUDs de este proyecto usan perPage fijo = 10 por requerimiento; cambiar aquí requiere adaptar esos componentes.</div>
            </div>

            <div>
              <label style={{ fontSize: 13, color: tema.borde }}>Registro público</label>
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={registroPublico} onChange={e => setRegistroPublico(e.target.checked)} />
                  <span style={{ color: tema.texto }}>{registroPublico ? 'Permitido' : 'Requerido invitación'}</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 10, padding: 12, border: `1px solid ${tema.borde}`, background: tema.secundario }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: tema.texto }}>Métodos de pago</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {Object.keys(metodosPago).map((k) => (
                <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!metodosPago[k]} onChange={e => setMetodosPago(prev => ({ ...prev, [k]: e.target.checked }))} />
                  <span style={{ color: tema.texto, textTransform: 'capitalize' }}>{k}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 10, padding: 12, border: `1px solid ${tema.borde}`, background: tema.secundario }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: tema.texto }}>Facturación</div>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={!!facturacion.habilitada} onChange={e => setFacturacion(prev => ({ ...prev, habilitada: e.target.checked }))} />
                <span style={{ color: tema.texto }}>Habilitar facturación</span>
              </label>

              <div>
                <label style={{ fontSize: 13, color: tema.borde }}>Proveedor</label>
                <input value={facturacion.proveedor} onChange={e => setFacturacion(prev => ({ ...prev, proveedor: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }} />
              </div>
            </div>
          </div>

          {error && <div style={{ color: '#a33' }}>{error}</div>}
          {ok && <div style={{ color: '#1f9d55' }}>{ok}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => {
              // reset to last saved values by refetching
              setLoading(true);
              getConfiguracion().then(r => {
                const conf = r?.data ?? {};
                setMoneda(conf.moneda ?? 'MXN');
                setImpuestoPorc(conf.impuestoPorc ?? 16);
                setPerPage(conf.perPage ?? 10);
                setMetodosPago(conf.metodosPago ?? { efectivo: true, tarjeta: true, transferencia: false });
                setFacturacion(conf.facturacion ?? { habilitada: false, proveedor: '' });
                setRegistroPublico(conf.registroPublico ?? true);
              }).catch(err => console.error(err)).finally(() => setLoading(false));
            }} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.secundario, color: tema.texto }}>Revertir</button>

            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: tema.primario, color: '#fff', fontWeight: 700 }}>{saving ? 'Guardando...' : 'Guardar configuración'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionGeneral;
