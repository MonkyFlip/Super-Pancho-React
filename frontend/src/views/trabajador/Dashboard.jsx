import React, { useState, useEffect, useCallback } from 'react';
import { temas } from '../../styles/temas';
import { FaCashRegister, FaClipboardList, FaSync, FaShoppingCart, FaSignOutAlt, FaSearch, FaTrash } from 'react-icons/fa';
import { getApiAreas, getProductosByArea, crearVenta, actualizarProducto } from '../../services/api';
import { isAuthenticated, getStoredUser, logout } from '../../services/auth';
import { useTranslation } from 'react-i18next';
import CambioTema from '../../components/CambioTema';
import CambioIdioma from '../../components/CambioIdioma';

const THEME_KEY = 'app_theme_selected';

const style = {
  container: { 
    padding: 15, 
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden', 
    background: '#f4f6f8'
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
    flexShrink: 0,
    height: 50,
    position: 'relative',
    zIndex: 100,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '65% 33%',
    gap: '2%',
    flex: 1,
    minHeight: 0, 
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1
  },
  card: (tema) => ({
    background: tema.fondo_card,
    borderRadius: 12,
    boxShadow: tema.sombra,
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tema.borde}`,
    height: '100%',
    overflow: 'hidden',
    padding: 16,
    boxSizing: 'border-box'
  }),
  title: (tema) => ({
    fontSize: 18,
    fontWeight: 700,
    color: tema.texto,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  }),
  searchContainer: {
    position: 'relative',
    marginBottom: 10,
    flexShrink: 0,
  },
  searchInput: (tema) => ({
    width: '100%',
    padding: '10px 10px 10px 35px',
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    background: tema.fondo,
    color: tema.texto,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box'
  }),
  select: (tema) => ({
    background: tema.fondo_card,
    color: tema.texto,
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    marginBottom: 10,
    cursor: 'pointer',
    fontSize: 15,
    width: '100%',
    outline: 'none',
    flexShrink: 0
  }),
  catalogList: (tema) => ({
    flex: 1, 
    overflowY: 'auto', 
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    background: tema.fondo,
  }),
  listItem: (tema, selected = false, disabled = false) => ({
    padding: '12px',
    borderBottom: `1px solid ${tema.borde}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: tema.texto,
    background: selected ? tema.primario + '20' : 'transparent',
    borderLeft: selected ? `4px solid ${tema.primario}` : '4px solid transparent',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: disabled ? 0.6 : 1,
    '&:hover': disabled ? {} : { background: tema.primario + '10' }
  }),
  cuentaListContainer: (tema) => ({
    flex: 1, 
    overflowY: 'auto', 
    background: tema.fondo,
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    padding: 10,
    marginBottom: 10
  }),
  cuentaItem: (tema) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${tema.borde}40`,
    fontSize: 14,
    color: tema.texto
  }),
  cuentaFooter: (tema) => ({
    flexShrink: 0,
    borderTop: `2px solid ${tema.borde}`,
    paddingTop: 10,
  }),
  totalDisplay: (tema) => ({
    fontSize: 24,
    fontWeight: 'bold',
    color: tema.texto,
    textAlign: 'right',
    marginBottom: 15
  }),
  actionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr', 
    gap: 10
  },
  btn: (tema, tipo = 'primary', disabled = false) => {
    let bg = tema.primario;
    if (tipo === 'danger') bg = tema.peligro;
    if (disabled) bg = tema.borde;

    return {
      background: bg,
      border: 'none',
      padding: '14px',
      borderRadius: 8,
      color: '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 700,
      fontSize: 15,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      opacity: disabled ? 0.6 : 1,
      transition: 'transform 0.1s',
      '&:active': disabled ? {} : { transform: 'scale(0.98)' }
    }
  },
  removeBtn: (tema) => ({
    background: 'transparent',
    border: 'none',
    color: tema.peligro,
    cursor: 'pointer',
    padding: 5,
    fontSize: 14,
    marginLeft: 8
  }),
  headerRightControls: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10 
  },
  iconButton: (tema) => ({
    background: tema.fondo_card,
    border: `1px solid ${tema.borde}`,
    color: tema.texto,
    cursor: 'pointer',
    borderRadius: '50%',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  badge: (tema) => ({
    background: tema.primario,
    color: '#fff',
    borderRadius: 12,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 'bold'
  }),
  stockWarning: (tema) => ({
    color: tema.peligro,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 8
  }),
  stockInfo: (tema) => ({
    color: tema.texto,
    opacity: 0.6,
    fontSize: 11,
    marginLeft: 8
  })
};

export default function PuntoVenta() {
  const { t, i18n } = useTranslation();
  const [temaKey, setTemaKey] = useState(localStorage.getItem(THEME_KEY) || 'bosque_claro');
  const tema = temas[temaKey];
  
  const [areas, setAreas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  
  const [cuenta, setCuenta] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  const ensureAuth = useCallback(() => {
    if (!isAuthenticated()) { window.location.hash = '#/login'; return false; }
    return true;
  }, []);

  const handleApiResponse = (response) => {
    let data = [];
    if (Array.isArray(response)) data = response;
    else if (Array.isArray(response?.data)) data = response.data;
    else if (response?.data && Array.isArray(response.data.data)) data = response.data.data;
    return data.map(item => ({ ...item, _id: item._id?.$oid || item._id || item.id }));
  };

  const fetchAreas = useCallback(async () => {
    setLoadingAreas(true);
    try {
      const res = await getApiAreas();
      const areasData = res.data?.data || res.data || [];
      setAreas(areasData);
      if (areasData.length > 0 && !areaSeleccionada) {
        setAreaSeleccionada(areasData[0]._id?.$oid || areasData[0]._id);
      }
    } catch (e) { console.error(e); } 
    finally { setLoadingAreas(false); }
  }, [areaSeleccionada]);

  const fetchProductos = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await getProductosByArea(id);
      setProductos(handleApiResponse(res));
      setBusqueda('');
    } catch (e) { setProductos([]); }
  }, []);

  useEffect(() => { if (ensureAuth()) fetchAreas(); }, [ensureAuth, fetchAreas]);
  useEffect(() => { if (areaSeleccionada) fetchProductos(areaSeleccionada); }, [areaSeleccionada, fetchProductos]);

  const agregarProducto = (p) => {
    const stockDisponible = p.stock || 0;
    const cantidadEnCuenta = cuenta[p._id]?.cantidad || 0;
    
    if (cantidadEnCuenta >= stockDisponible) {
      alert(`${t('alertNoStock', 'No hay suficiente stock de')} ${p.nombre}. ${t('availableStock', 'Stock disponible')}: ${stockDisponible}`);
      return;
    }
    
    const nueva = { ...cuenta };
    const id = p._id;
    if (nueva[id]) {
      nueva[id].cantidad++;
    } else {
      nueva[id] = { ...p, cantidad: 1 };
    }
    setCuenta(nueva);
    recalcularTotal(nueva);
  };

  const quitarProducto = (id) => {
    const nueva = { ...cuenta };
    if (nueva[id]) {
      if (nueva[id].cantidad > 1) nueva[id].cantidad--;
      else delete nueva[id];
      setCuenta(nueva);
      recalcularTotal(nueva);
    }
  };

  const eliminarProductoCompleto = (id) => {
    const nueva = { ...cuenta };
    delete nueva[id];
    setCuenta(nueva);
    recalcularTotal(nueva);
  };

  const recalcularTotal = (c) => {
    const t = Object.values(c).reduce((sum, p) => sum + (p.precio || p.price || 0) * p.cantidad, 0);
    setTotal(t);
  };

  const atenderCliente = async () => {
    if (!Object.keys(cuenta).length) return;
    setLoading(true);
    try {
      const productosConStockActualizado = Object.values(cuenta).map(p => {
        const nuevoStock = (p.stock || 0) - p.cantidad;
        return {
          producto_id: p._id,
          cantidad: p.cantidad,
          area_id: p.area_id,
          nuevo_stock: Math.max(0, nuevoStock)
        };
      });

      const productosSinStock = productosConStockActualizado.filter(p => p.nuevo_stock < 0);
      if (productosSinStock.length > 0) {
        const nombresSinStock = productosSinStock.map(p => {
          const producto = cuenta[p.producto_id];
          return producto?.nombre || 'Producto desconocido';
        }).join(', ');
        
        alert(`${t('alertInsufficientStock', 'Stock insuficiente para')}: ${nombresSinStock}`);
        return;
      }

      await crearVenta({
        cliente_ref: null,
        productos: productosConStockActualizado.map(p => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          area_id: p.area_id
        })),
        vendedor_key: getStoredUser()?.usuario || 'admin',
        metodo_pago: 'efectivo',
        estado: 'completada',
      });

      for (const item of productosConStockActualizado) {
        try {
          await actualizarProducto(item.producto_id, {
            stock: item.nuevo_stock
          });
        } catch (error) {
          console.error(`Error actualizando stock para producto ${item.producto_id}:`, error);
        }
      }

      alert(t('alertSaleSuccess', 'Venta registrada y stock actualizado'));
      setCuenta({}); 
      setTotal(0);
      
      if (areaSeleccionada) {
        fetchProductos(areaSeleccionada);
      }
      
    } catch (e) { 
      console.error('Error en la venta:', e);
      alert(t('alertSaleError', 'Error al registrar la venta')); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  const productosFiltrados = productos.filter(p => 
    (p.nombre || p.name || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const renderCatalogo = () => (
    <div style={style.card(tema)}>
      <h3 style={style.title(tema)}><FaClipboardList /> {t('productss', 'Productos')}</h3>
      
      <select style={style.select(tema)} value={areaSeleccionada} onChange={e => setAreaSeleccionada(e.target.value)}>
        {loadingAreas ? <option>{t('loading', 'Cargando...')}</option> : areas.map(a => (
          <option key={a._id?.$oid || a._id} value={a._id?.$oid || a._id}>{a.nombre || a.name}</option>
        ))}
      </select>

      <div style={style.searchContainer}>
        <FaSearch style={{ position: 'absolute', left: 12, top: 12, color: tema.texto, opacity: 0.5 }} />
        <input 
          style={style.searchInput(tema)} 
          placeholder={t('searchProduct', 'Buscar producto...')} 
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <div style={style.catalogList(tema)}>
        {productosFiltrados.map(p => {
          const enCuenta = cuenta[p._id];
          const stockDisponible = p.stock || 0;
          const sinStock = stockDisponible <= 0;
          
          return (
            <div 
              key={p._id} 
              style={style.listItem(tema, !!enCuenta, sinStock)} 
              onClick={() => !sinStock && agregarProducto(p)}
            >
              <div>
                <div style={{fontWeight: 600}}>{p.nombre || p.name}</div>
                <div style={{fontSize: 12, opacity: 0.8}}>
                  ${(p.precio||0).toFixed(2)} 
                  {sinStock ? (
                    <span style={style.stockWarning(tema)}>
                      {t('outOfStock', 'Sin stock')}
                    </span>
                  ) : (
                    <span style={style.stockInfo(tema)}>
                      {t('stock', 'Stock')}: {stockDisponible}
                    </span>
                  )}
                </div>
              </div>
              {enCuenta && <span style={style.badge(tema)}>{enCuenta.cantidad}</span>}
            </div>
          );
        })}
        {productosFiltrados.length === 0 && (
            <div style={{padding: 20, textAlign: 'center', opacity: 0.6}}>
                {t('noProducts', 'No hay productos')}
            </div>
        )}
      </div>
    </div>
  );

  const renderCuenta = () => (
    <div style={style.card(tema)}>
      <h3 style={style.title(tema)}><FaCashRegister /> {t('realTimeAccount', 'Cuenta')}</h3>
      
      <div style={style.cuentaListContainer(tema)}>
        {Object.keys(cuenta).length === 0 ? (
          <div style={{textAlign: 'center', padding: 40, opacity: 0.5, fontStyle: 'italic'}}>
            <FaShoppingCart size={40} style={{marginBottom: 10}} />
            <br/>{t('emptyList', 'Lista vacía')}
          </div>
        ) : (
          Object.values(cuenta).map(p => (
            <div key={p._id} style={style.cuentaItem(tema)}>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 600}}>{p.nombre}</div>
                <div style={{fontSize: 12}}>
                  ${(p.precio||0).toFixed(2)} {t('each', 'c/u')} x {p.cantidad}
                  <span style={style.stockInfo(tema)}>
                    ({t('remainingStock', 'Stock restante')}: {(p.stock || 0) - p.cantidad})
                  </span>
                </div>
              </div>
              <div style={{fontWeight: 'bold', marginRight: 10}}>
                ${((p.precio||0)*p.cantidad).toFixed(2)}
              </div>
              <div style={{display:'flex'}}>
                <button style={style.removeBtn(tema)} onClick={(e) => { e.stopPropagation(); quitarProducto(p._id); }}>-</button>
                <button style={style.removeBtn(tema)} onClick={(e) => { e.stopPropagation(); eliminarProductoCompleto(p._id); }}><FaTrash size={12}/></button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={style.cuentaFooter(tema)}>
        <div style={style.totalDisplay(tema)}>
          {t('total', 'Total')}: ${total.toFixed(2)}
        </div>
        
        <div style={style.actionsRow}>
          <button 
            style={style.btn(tema, 'danger', Object.keys(cuenta).length === 0)} 
            onClick={() => { setCuenta({}); setTotal(0); }}
            disabled={loading || Object.keys(cuenta).length === 0}
          >
            <FaSync /> {t('clear', 'Limpiar')}
          </button>
          
          <button 
            style={style.btn(tema, 'primary', Object.keys(cuenta).length === 0)}
            onClick={atenderCliente}
            disabled={loading || Object.keys(cuenta).length === 0}
          >
             {loading ? t('processing', 'Procesando...') : t('checkout', 'COBRAR')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={style.container}>
      <div style={style.headerControls}>
        <h2 style={style.title(tema)}><FaShoppingCart /> {t('pointOfSale', 'Punto de Venta')}</h2>
        <div style={style.headerRightControls}>
          <span style={{fontWeight:600, color: tema.texto}}>
            {t('user', 'Usuario')}: {getStoredUser()?.usuario}
          </span>
          
          <CambioIdioma 
            onChange={i18n.changeLanguage} 
            defaultLang={i18n.language}
            direction="down" 
          />
          <CambioTema 
            value={temaKey} 
            onChange={k => {setTemaKey(k); localStorage.setItem(THEME_KEY, k);}} 
            direction="down"
          />
          
          <button 
            style={style.iconButton(tema)} 
            onClick={() => { logout(); window.location.hash='#/login'; }}
            title={t('logout', 'Salir')}
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      <div style={style.grid}>
        {renderCatalogo()}
        {renderCuenta()}
      </div>
    </div>
  );
}