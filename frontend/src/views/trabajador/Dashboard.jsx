import React, { useState, useEffect, useCallback } from 'react';
import { temas } from '../../styles/temas';
import { FaCashRegister, FaClipboardList, FaSync, FaShoppingCart, FaFileAlt, FaSignOutAlt } from 'react-icons/fa';
import { getAreas, getProductos, crearVenta } from '../../services/api';
import { isAuthenticated, getStoredUser, logout } from '../../services/auth';
import { useTranslation } from 'react-i18next';
import CambioTema from '../../components/CambioTema';
import CambioIdioma from '../../components/CambioIdioma';

const THEME_KEY = 'app_theme_selected';

const style = {
  container: { 
    padding: 20,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr', // Cambiado para dar más espacio a la izquierda
    gap: 20,
    flex: 1,
    minHeight: 0,
  },
  card: (tema) => ({
    background: tema.fondo_card,
    borderRadius: 12,
    boxShadow: tema.sombra,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tema.borde}`,
    height: '100%',
  }),
  title: (tema) => ({
    fontSize: 20,
    fontWeight: 700,
    color: tema.texto,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }),
  select: (tema) => ({
    background: tema.fondo_card,
    color: tema.texto,
    padding: 12,
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    marginBottom: 16,
    cursor: 'pointer',
    fontSize: 16,
    width: '100%',
  }),
  list: (tema) => ({
    flex: 1,
    overflowY: 'auto',
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
    background: tema.fondo,
    minHeight: 0,
  }),
  listItem: (tema, selected = false) => ({
    padding: '12px 16px',
    borderBottom: `1px solid ${tema.borde}`,
    cursor: 'pointer',
    color: tema.texto,
    background: selected ? tema.primario + '20' : 'transparent',
    borderLeft: selected ? `4px solid ${tema.primario}` : '4px solid transparent',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: tema.primario + '10',
    }
  }),
  cuenta: (tema) => ({
    flex: 1,
    overflowY: 'auto',
    borderRadius: 8,
    background: tema.fondo,
    color: tema.texto,
    fontFamily: 'Consolas, monospace',
    padding: 20,
    border: `1px solid ${tema.borde}`,
    minHeight: 0,
    fontSize: 15,
    lineHeight: 1.6,
  }),
  btn: (tema, color, disabled = false) => ({
    background: disabled ? tema.borde : (color || tema.primario),
    border: 'none',
    padding: '12px 24px',
    borderRadius: 8,
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: 14,
    opacity: disabled ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
    '&:hover:not(:disabled)': {
      opacity: 0.9,
      transform: 'translateY(-1px)',
    }
  }),
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTop: `1px solid ${temas.bosque_claro.borde}`,
  },
  emptyState: (tema) => ({
    textAlign: 'center',
    padding: 40,
    color: tema.texto + '80',
    fontStyle: 'italic',
  }),
  productInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityBadge: (tema) => ({
    background: tema.primario,
    color: '#fff',
    borderRadius: '50%',
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  }),
  productName: {
    fontWeight: 600,
    marginBottom: 4,
  },
  productPrice: (tema) => ({
    fontSize: 12,
    color: tema.texto + '80',
  }),
  cuentaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: '10px 0',
    borderBottom: `1px solid ${temas.bosque_claro.borde}20`,
  },
  cuentaTotal: {
    borderTop: `2px solid ${temas.bosque_claro.borde}`,
    paddingTop: 16,
    marginTop: 16,
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'right',
  },
  removeBtn: (tema) => ({
    background: 'none',
    border: 'none',
    color: tema.peligro,
    cursor: 'pointer',
    fontSize: 16,
    padding: '6px 10px',
    borderRadius: 4,
    '&:hover': {
      background: tema.peligro + '20',
    }
  }),
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  headerRightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: (tema) => ({
    background: tema.fondo_card,
    border: `1px solid ${tema.borde}`,
    color: tema.texto,
    cursor: 'pointer',
    borderRadius: '50%',
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: tema.borde,
      color: tema.primario,
    }
  }),
  userInfo: (tema) => ({
    color: tema.texto,
    fontSize: 14,
    fontWeight: 600,
    padding: '8px 12px',
    background: tema.fondo_card,
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
  }),
  themeLanguageContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  leftAlignedControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  leftButtonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  leftButton: (tema) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderRadius: 8,
    background: tema.fondo_card,
    color: tema.texto,
    border: `1px solid ${tema.borde}`,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    width: '100%',
    '&:hover': {
      background: tema.primario + '10',
      borderColor: tema.primario,
    }
  })
};

export default function PuntoVenta() {
  const { t, i18n } = useTranslation();
  const [temaKey, setTemaKey] = useState(localStorage.getItem(THEME_KEY) || 'bosque_claro');
  const tema = temas[temaKey];
  const [areas, setAreas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [cuenta, setCuenta] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [errorAreas, setErrorAreas] = useState(null);

  const ensureAuth = useCallback(() => {
    if (!isAuthenticated()) {
      window.location.hash = '#/login';
      return false;
    }
    return true;
  }, []);

  const handleApiResponse = (response) => {
    let data = [];

    if (Array.isArray(response)) {
      data = response;
    } else if (Array.isArray(response?.data)) {
      data = response.data;
    } else if (response?.data && Array.isArray(response.data.data)) {
      data = response.data.data;
    } else if (response?.data && typeof response.data === 'object') {
      data = Object.values(response.data);
    }

    return data.map((item) => ({
      ...item,
      _id: item._id?.$oid || item._id || item.id,
    }));
  };

  const fetchAreas = useCallback(async () => {
    setLoadingAreas(true);
    setErrorAreas(null);
    try {
      const res = await getAreas();
      const areasData = res.data?.data || res.data || [];
      setAreas(areasData);

      if (areasData.length > 0 && !areaSeleccionada) {
        const primerId = areasData[0]._id?.$oid || areasData[0]._id || areasData[0].id;
        setAreaSeleccionada(primerId || '');
      }
    } catch (e) {
      console.error('Error cargando áreas:', e);
      setErrorAreas('Error al cargar las áreas');
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, [areaSeleccionada]);

  const fetchProductos = useCallback(async (idDeArea) => {
    if (!idDeArea) return;
    try {
      const res = await getProductos({ area: idDeArea });
      const productosData = handleApiResponse(res);
      setProductos(productosData);
    } catch (e) {
      console.error('Error cargando productos:', e);
      setProductos([]);
    }
  }, []);

  useEffect(() => {
    if (ensureAuth()) fetchAreas();
  }, [ensureAuth, fetchAreas]);

  useEffect(() => {
    if (areaSeleccionada) {
      fetchProductos(areaSeleccionada);
    }
  }, [areaSeleccionada, fetchProductos]);

  const handleThemeChange = (newThemeKey) => {
    setTemaKey(newThemeKey);
    try {
      localStorage.setItem(THEME_KEY, newThemeKey);
    } catch (error) {
      console.error('Error guardando tema:', error);
    }
  };

  const handleLanguageChange = (newLang) => {
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    window.location.hash = '#/login';
  };

  const agregarProducto = (producto) => {
    const nuevaCuenta = { ...cuenta };
    if (nuevaCuenta[producto._id]) {
      nuevaCuenta[producto._id].cantidad += 1;
    } else {
      nuevaCuenta[producto._id] = { 
        ...producto, 
        cantidad: 1 
      };
    }
    setCuenta(nuevaCuenta);
    recalcularTotal(nuevaCuenta);
  };

  const quitarProducto = (productoId) => {
    const nuevaCuenta = { ...cuenta };
    if (nuevaCuenta[productoId]) {
      if (nuevaCuenta[productoId].cantidad > 1) {
        nuevaCuenta[productoId].cantidad -= 1;
      } else {
        delete nuevaCuenta[productoId];
      }
      setCuenta(nuevaCuenta);
      recalcularTotal(nuevaCuenta);
    }
  };

  const recalcularTotal = (cuentaActual) => {
    const total = Object.values(cuentaActual).reduce(
      (sum, p) => sum + (p.precio || p.price || 0) * p.cantidad,
      0
    );
    setTotal(total);
  };

  const limpiarCuenta = () => {
    setCuenta({});
    setTotal(0);
  };

  const atenderCliente = async () => {
    if (!Object.keys(cuenta).length) {
      alert('No hay productos en la cuenta.');
      return;
    }

    setLoading(true);
    try {
      const venta = {
        cliente_ref: null,
        productos: Object.values(cuenta).map((p) => ({
          nombre: p.nombre || p.name,
          precio: p.precio || p.price,
          cantidad: p.cantidad,
        })),
        total,
        vendedor_key: getStoredUser()?.usuario || 'admin',
        metodo_pago: 'efectivo',
        estado: 'completada',
      };
      await crearVenta(venta);
      alert('✅ Venta registrada correctamente.');
      limpiarCuenta();
    } catch (e) {
      console.error('Error registrando venta:', e);
      alert('❌ Error al registrar la venta.');
    } finally {
      setLoading(false);
    }
  };


  const renderColumnaIzquierda = () => (
    <div style={style.card(tema)}>
      <h3 style={style.title(tema)}>
        <FaClipboardList /> {t('productss', 'Productos')}
      </h3>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, color: tema.texto, fontWeight: 600 }}>
          {t('selectArea', 'Seleccionar área:')}
        </label>
        <select
          style={style.select(tema)}
          value={areaSeleccionada}
          onChange={(e) => setAreaSeleccionada(e.target.value)}
          disabled={loadingAreas}
        >
          {loadingAreas ? (
            <option value="">{t('loadingAreas', 'Cargando áreas...')}</option>
          ) : errorAreas ? (
            <option value="">{t('errorLoadingAreas', 'Error al cargar áreas')}</option>
          ) : Array.isArray(areas) && areas.length > 0 ? (
            areas.map((a) => {
              const areaId = a._id?.$oid || a._id || a.id;
              return (
                <option key={areaId} value={areaId}>
                  {a.nombre || a.name}
                </option>
              );
            })
          ) : (
            <option value="">{t('noAreasAvailable', 'No hay áreas disponibles')}</option>
          )}
        </select>
      </div>

      <div style={{ marginBottom: 8, color: tema.texto, fontWeight: 600 }}>
        {t('areaProducts', 'Productos del área:')}
      </div>

      <div style={style.list(tema)}>
        {Array.isArray(productos) && productos.length > 0 ? (
          productos.map((p) => (
            <div
              key={p._id || p.id}
              style={style.listItem(tema, cuenta[p._id || p.id])}
              onClick={() => agregarProducto(p)}
            >
              <div style={style.productInfo}>
                <div style={{ flex: 1 }}>
                  <div style={style.productName}>
                    {p.nombre || p.name}
                  </div>
                  <div style={style.productPrice(tema)}>
                    ${(p.precio || p.price || 0).toFixed(2)}
                  </div>
                </div>
                {cuenta[p._id || p.id] && (
                  <div style={style.quantityBadge(tema)}>
                    {cuenta[p._id || p.id].cantidad}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={style.emptyState(tema)}>
            {loadingAreas ? t('loadingProducts', 'Cargando productos...') : t('noProductsAvailable', 'No hay productos disponibles en esta área')}
          </div>
        )}
      </div>
    </div>
  );

  const renderColumnaDerecha = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Cuenta en tiempo real - Ahora arriba a la derecha */}
      <div style={style.card(tema)}>
        <h3 style={style.title(tema)}>
          <FaCashRegister /> {t('realTimeAccount', 'Cuenta en Tiempo Real')}
        </h3>

        <div style={style.cuenta(tema)}>
          {Object.values(cuenta).length > 0 ? (
            <>
              {Object.values(cuenta).map((p) => (
                <div key={p._id || p.id} style={style.cuentaItem}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {p.nombre || p.name} x{p.cantidad}
                    </div>
                    <div style={{ fontSize: 13, color: tema.texto + '80' }}>
                      ${(p.precio || p.price || 0).toFixed(2)} {t('each', 'c/u')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 600, minWidth: 90, textAlign: 'right', fontSize: 15 }}>
                      ${((p.precio || p.price || 0) * p.cantidad).toFixed(2)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        quitarProducto(p._id || p.id);
                      }}
                      style={style.removeBtn(tema)}
                      title={t('removeProduct', 'Quitar un producto')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div style={style.cuentaTotal}>
                {t('total', 'Total')}: ${total.toFixed(2)}
              </div>
            </>
          ) : (
            <div style={style.emptyState(tema)}>
              {t('noProductsInAccount', 'No hay productos en la cuenta')}
            </div>
          )}
        </div>
      </div>

      {/* Botones operativos - Ahora abajo a la derecha */}
      <div style={style.card(tema)}>
        <h3 style={style.title(tema)}>
          <FaShoppingCart /> {t('actions', 'Acciones')}
        </h3>
        <div style={style.leftButtonsContainer}>
          
          <button
            style={style.leftButton(tema)}
            onClick={limpiarCuenta}
            disabled={loading || Object.keys(cuenta).length === 0}
          >
            <FaSync /> {t('clear', 'Limpiar')}
          </button>
          
          <button
            style={style.leftButton(tema)}
            onClick={atenderCliente}
            disabled={loading || Object.keys(cuenta).length === 0}
          >
            {loading ? t('processing', 'Procesando...') : (
              <>
                ✅ {t('attendCustomer', 'Atender Cliente')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={style.container}>
      
      {/* ===== ÁREA MODIFICADA ===== */}
      <div style={style.headerControls}>
        {/* Lado Izquierdo: Título (sin cambios) */}
        <h2 style={style.title(tema)}>
          <FaShoppingCart /> {t('pointOfSale', 'Punto de Venta')}
        </h2>
        
        {/* Lado Derecho: Controles de usuario y configuración */}
        <div style={style.headerRightControls}>
          <div style={style.userInfo(tema)}>
            {t('user', 'Usuario')}: {getStoredUser()?.usuario || 'admin'}
          </div>

          {/* Controles de Tema e Idioma (MOVIDOS AQUÍ) */}
          <div style={style.themeLanguageContainer}>
            <CambioIdioma 
              onChange={handleLanguageChange} 
              defaultLang={i18n.language}
              direction="down" 
            />
            <CambioTema 
              value={temaKey} 
              onChange={handleThemeChange}
              direction="down" 
            />
          </div>
          
          {/* Botón de Logout (MOVIDO AQUÍ y re-estilizado) */}
          <button
            onClick={handleLogout}
            style={style.iconButton(tema)} // <-- Nuevo estilo de ícono
            title={t('logout', 'Cerrar sesión')}
          >
            <FaSignOutAlt />
            {/* Quitamos el texto para que sea solo un ícono */}
          </button>
        </div>
      </div>
      {/* ===== FIN ÁREA MODIFICADA ===== */}

      <div style={style.grid}>
        {renderColumnaIzquierda()}
        {renderColumnaDerecha()}
      </div>

      {/* ===== ELIMINADO ===== */}
      {/* Ya no necesitamos el bottomControls */}
    </div>
  );
}