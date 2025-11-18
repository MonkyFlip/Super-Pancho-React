import React, { useState, useEffect } from 'react';
import { temas } from '../../styles/temas';
import { useTranslation } from 'react-i18next';
import { isAuthenticated, getStoredUser, logout } from '../../services/auth';
import CambioTema from '../../components/CambioTema';
import CambioIdioma from '../../components/CambioIdioma';
import api from '../../services/api'; 

// --- IMPORTACIÓN DE ICONOS ---
import { 
  // UI General
  FaStore, FaBookOpen, FaTags, FaMapMarkerAlt, FaInfoCircle, FaPhone, 
  FaSignInAlt, FaSignOutAlt, FaUser, FaSync,
  // Iconos de Categorías Específicos
  FaShoppingBasket, FaAppleAlt, FaDrumstickBite, FaCheese, FaBreadSlice, 
  FaWineBottle, FaSnowflake, FaPumpSoap, FaBroom, FaPaw, FaLaptop, FaMobileAlt
} from 'react-icons/fa';

const THEME_KEY = 'app_theme_selected';

// --- LÓGICA DE ICONOS INTELIGENTE ---
const getCategoryIcon = (nombre) => {
  const n = nombre.toLowerCase();
  // Alimentos Frescos
  if (n.includes('frutas') || n.includes('verduras') || n.includes('fruits') || n.includes('vegetables')) return <FaAppleAlt />;
  if (n.includes('carnes') || n.includes('pescados') || n.includes('meats') || n.includes('fish')) return <FaDrumstickBite />;
  if (n.includes('lácteos') || n.includes('huevos') || n.includes('dairy') || n.includes('eggs')) return <FaCheese />;
  if (n.includes('panadería') || n.includes('repostería') || n.includes('bakery')) return <FaBreadSlice />;
  // Bebidas y Congelados
  if (n.includes('bebidas') || n.includes('licores') || n.includes('beverages')) return <FaWineBottle />;
  if (n.includes('congelados') || n.includes('helados') || n.includes('frozen')) return <FaSnowflake />;
  // Hogar y Cuidado
  if (n.includes('higiene') || n.includes('personal') || n.includes('care')) return <FaPumpSoap />;
  if (n.includes('limpieza') || n.includes('cleaning')) return <FaBroom />;
  if (n.includes('mascotas') || n.includes('pets')) return <FaPaw />;
  // Tecnología y General
  if (n.includes('electrónica') || n.includes('comput') || n.includes('electronics')) return <FaLaptop />;
  if (n.includes('celular') || n.includes('telef') || n.includes('mobile')) return <FaMobileAlt />;
  if (n.includes('abarrotes') || n.includes('groceries')) return <FaShoppingBasket />;
  
  return <FaShoppingBasket />; // Default
};

// ==================== ESTILOS VISUALES ====================
const style = {
  layout: (tema) => ({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100%',
    background: tema.fondo,
    color: tema.texto,
    transition: 'background 0.3s ease, color 0.3s ease',
  }),
  header: (tema) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: tema.fondo_card,
    borderBottom: `1px solid ${tema.borde}`,
    boxShadow: tema.sombra,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  }),
  headerTitle: (tema) => ({
    fontSize: 24,
    fontWeight: 700,
    color: tema.primario,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  }),
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: (tema) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    padding: '8px 12px',
    background: tema.fondo,
    borderRadius: 8,
    border: `1px solid ${tema.borde}`,
  }),
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
  nav: (tema) => ({
    display: 'flex',
    justifyContent: 'center',
    background: tema.fondo_card + '80',
    backdropFilter: 'blur(5px)',
    borderBottom: `1px solid ${tema.borde}`,
    padding: '0 24px',
    position: 'sticky',
    top: 73,
    zIndex: 99,
    overflowX: 'auto'
  }),
  navLink: (tema, isActive = false) => ({
    padding: '16px 20px',
    margin: '0 4px',
    fontSize: 15,
    fontWeight: 600,
    color: isActive ? tema.primario : tema.texto + 'A0',
    borderBottom: `3px solid ${isActive ? tema.primario : 'transparent'}`,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'transparent',
    border: 'none',
    whiteSpace: 'nowrap',
    '&:hover': {
      color: tema.primario,
      background: tema.borde,
    }
  }),
  categoryChip: (tema, isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 50,
    border: isActive ? `1px solid ${tema.primario}` : `1px solid ${tema.borde}`,
    background: isActive ? tema.primario : tema.fondo_card,
    color: isActive ? '#fff' : tema.texto,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: isActive ? `0 4px 10px ${tema.primario}40` : 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
    '&:hover': {
      transform: 'translateY(-2px)',
      background: isActive ? tema.primario : tema.borde,
      opacity: isActive ? 0.9 : 1
    }
  }),
  main: {
    flex: 1,
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  },
  section: (tema) => ({
    background: tema.fondo_card,
    borderRadius: 12,
    boxShadow: tema.sombra,
    border: `1px solid ${tema.borde}`,
    padding: 24,
    marginBottom: 24,
  }),
  sectionTitle: (tema) => ({
    fontSize: 22,
    fontWeight: 700,
    color: tema.texto,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: `2px solid ${tema.borde}`,
    paddingBottom: 12,
  }),
  heroBanner: (tema) => ({
    background: `linear-gradient(135deg, ${tema.primario} 0%, ${tema.secundario} 100%)`,
    color: '#fff',
    padding: 48,
    borderRadius: 12,
    textAlign: 'center',
  }),
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  productCard: (tema) => ({
    background: tema.fondo,
    border: `1px solid ${tema.borde}`,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    }
  }),
  productImage: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    background: '#f0f0f0',
  },
  productInfo: {
    padding: 16,
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  productName: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  productPrice: (tema) => ({
    fontSize: 16,
    fontWeight: 700,
    color: tema.primario,
    marginBottom: 12,
  }),
  productDesc: {
    fontSize: 14,
    lineHeight: 1.5,
    color: 'inherit',
    opacity: 0.8
  },
  footer: (tema) => ({
    textAlign: 'center',
    padding: 24,
    borderTop: `1px solid ${tema.borde}`,
    color: tema.texto + '80',
    fontSize: 14,
    marginTop: 24,
  })
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function ClientePortal() {
  const { t, i18n } = useTranslation();
  
  const [temaKey, setTemaKey] = useState(localStorage.getItem(THEME_KEY) || 'bosque_claro');
  const [authenticated, setAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  const [selectedCategoria, setSelectedCategoria] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Estados de Datos Reales
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [promociones, setPromociones] = useState([]);

  const tema = temas[temaKey];

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    cargarDatosReales();
  }, []);

  const cargarDatosReales = async () => {
    setLoading(true);
    try {
      // 1. Cargar Areas (Categorías)
      const resAreas = await api.get('/areas?limit=100'); 
      const areasData = resAreas.data.data || [];
      
      const catsMapeadas = areasData.map(area => ({
        id: area._id,
        nombre: area.nombre,
        icon: getCategoryIcon(area.nombre)
      }));
      setCategorias(catsMapeadas);

      // 2. Cargar IDs de Imágenes para aleatoriedad
      let idsImagenes = [];
      try {
        const resImg = await api.get('/multimedia/archivos?tipo=imagen&limit=50');
        if(resImg.data.ok) {
          idsImagenes = resImg.data.archivos.map(file => file.id);
        }
      } catch (e) {
        console.warn("No se pudieron cargar imágenes para aleatoriedad", e);
      }

      // 3. Cargar Productos
      const resProd = await api.get('/productos?limit=100');
      const prodData = resProd.data.data || [];

      const productosProcesados = prodData.map((prod) => {
        let imagenUrl = 'https://via.placeholder.com/300x200.png?text=Sin+Imagen';
        
        if (idsImagenes.length > 0) {
          const randomIndex = Math.floor(Math.random() * idsImagenes.length);
          const randomId = idsImagenes[randomIndex];
          imagenUrl = `${api.defaults.baseURL}/multimedia/archivo/${randomId}`;
        }

        return {
          id: prod._id?.$oid || prod._id, 
          categoria: prod.area_id, 
          nombre: prod.nombre,
          precio: parseFloat(prod.precio),
          descripcion: prod.descripcion || t('products.defaultDescription', 'Product available. SKU: {{sku}}', { sku: prod.sku }),
          imagen: imagenUrl
        };
      });

      setProductos(productosProcesados);

      // 4. Promociones Fake (3 aleatorios)
      const promosFake = productosProcesados
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((p, i) => ({
          id: p.id,
          titulo: t('promos.offerTitle', '¡Offer on {{product}}!', { product: p.nombre }),
          descripcion: t('promos.offerDescription', 'Get this amazing product for only ${{price}}', { price: p.precio.toFixed(2) }),
          imagen: p.imagen,
          insight: i === 1 
        }));
      setPromociones(promosFake);

    } catch (error) {
      console.error("Error cargando datos del portal:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleThemeChange = (newThemeKey) => {
    setTemaKey(newThemeKey);
    try { localStorage.setItem(THEME_KEY, newThemeKey); } catch (error) {}
  };

  const handleLanguageChange = (newLang) => i18n.changeLanguage(newLang);

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setActiveSection('inicio');
  };
  
  const handleLogin = () => window.location.hash = '#/login';

  const handleNavClick = (section) => {
    setActiveSection(section);
    if (section === 'productos') setSelectedCategoria('todos');
  };

  // --- RENDERIZADORES ---

  const renderHeader = () => (
    <header style={style.header(tema)}>
      <div style={style.headerTitle(tema)}>
        <FaStore />
        <span>{t('clientPortal.title', 'Customer Portal')}</span>
      </div>
      
      <div style={style.headerControls}>
        <CambioIdioma onChange={handleLanguageChange} defaultLang={i18n.language} direction="down" />
        <CambioTema value={temaKey} onChange={handleThemeChange} direction="down" />
        
        {authenticated ? (
          <>
            <div style={style.userInfo(tema)}>
              <FaUser />
              <span>{getStoredUser()?.usuario || t('common.customer', 'Customer')}</span>
            </div>
            <button onClick={handleLogout} style={style.iconButton(tema)} title={t('logout', 'Log out')}>
              <FaSignOutAlt />
            </button>
          </>
        ) : (
          <button onClick={handleLogin} style={style.iconButton(tema)} title={t('login', 'Log in')}>
            <FaSignInAlt />
          </button>
        )}
      </div>
    </header>
  );

  const renderNav = () => (
    <nav style={style.nav(tema)}>
      {[
        { key: 'inicio', label: t('nav.home', 'Home'), icon: <FaStore /> },
        { key: 'productos', label: t('nav.products', 'Products'), icon: <FaBookOpen /> },
        { key: 'promociones', label: t('nav.promos', 'Promotions'), icon: <FaTags /> },
        { key: 'sucursales', label: t('nav.locations', 'Locations'), icon: <FaMapMarkerAlt /> },
        { key: 'nosotros', label: t('nav.about', 'About Us'), icon: <FaInfoCircle /> },
      ].map((item) => (
        <button 
          key={item.key}
          style={style.navLink(tema, activeSection === item.key)}
          onClick={() => handleNavClick(item.key)}
        >
          {item.icon} {item.label}
        </button>
      ))}
    </nav>
  );

  const renderLoading = () => (
    <div style={{ padding: 60, textAlign: 'center', color: tema.texto }}>
      <FaSync className="fa-spin" style={{ fontSize: 30, marginBottom: 16 }} />
      <p>{t('loading', 'Loading SuperTech catalog...')}</p>
    </div>
  );

  const renderInicio = () => (
    <div style={style.section(tema)}>
      <div style={style.heroBanner(tema)}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>
          {t('home.welcome', 'Welcome to SuperTech')}
        </h1>
        <p style={{ fontSize: 18, opacity: 0.9, marginTop: 12 }}>
          {t('home.subtitle', 'The best technology and fresh products in one place.')}
        </p>
      </div>
    </div>
  );
  
  const renderProductos = () => {
    const productosFiltrados = selectedCategoria === 'todos' 
      ? productos 
      : productos.filter(p => p.categoria === selectedCategoria);
      
    return (
      <div style={style.section(tema)}>
        <h2 style={style.sectionTitle(tema)}>
          <FaBookOpen /> {t('products.title', 'Product Catalog')}
        </h2>
        
        {/* Filtros de Categoría */}
        <div style={{ 
            marginBottom: 24, 
            display: 'flex', 
            gap: 12, 
            flexWrap: 'wrap',
            justifyContent: 'center'
        }}>
          <button 
            style={style.categoryChip(tema, selectedCategoria === 'todos')}
            onClick={() => setSelectedCategoria('todos')}
          >
            <FaStore /> {t('products.all', 'All')}
          </button>

          {categorias.map(cat => (
            <button 
              key={cat.id}
              style={style.categoryChip(tema, selectedCategoria === cat.id)}
              onClick={() => setSelectedCategoria(cat.id)}
            >
              {cat.icon} {cat.nombre}
            </button>
          ))}
        </div>
        
        {/* Grid de Productos */}
        {productosFiltrados.length === 0 ? (
            <div style={{textAlign: 'center', padding: 40, color: tema.texto, opacity: 0.7}}>
               <FaShoppingBasket style={{fontSize: 40, marginBottom: 10}}/>
               <p>{t('products.noProducts', 'No products found in this category.')}</p>
            </div>
        ) : (
            <div style={style.productGrid}>
            {productosFiltrados.map(p => (
                <div key={p.id} style={style.productCard(tema)}>
                <img src={p.imagen} alt={p.nombre} style={style.productImage} loading="lazy" />
                <div style={style.productInfo}>
                    <div style={style.productName}>{p.nombre}</div>
                    <div style={style.productPrice(tema)}>
                      ${p.precio.toFixed(2)} {t('common.each', 'each')}
                    </div>
                    <div style={style.productDesc}>{p.descripcion}</div>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    );
  };

  const renderPromociones = () => (
    <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaTags /> {t('promos.title', 'Special Promotions')}
      </h2>
      <div style={style.productGrid}>
        {promociones.map(promo => (
          <div 
            key={promo.id}
            style={{ 
              ...style.productCard(tema), 
              background: promo.insight ? `linear-gradient(45deg, ${tema.primario}20, ${tema.fondo})` : tema.fondo,
              border: promo.insight ? `2px solid ${tema.primario}` : `1px solid ${tema.borde}`,
            }}
          >
             <img src={promo.imagen} alt={promo.titulo} style={style.productImage} loading="lazy" />
            <div style={style.productInfo}>
              {promo.insight && (
                <div style={{ fontSize: 12, fontWeight: 700, color: tema.primario, marginBottom: 8 }}>
                  🔥 {t('promos.spark', 'INSIGHT RECOMMENDED')}
                </div>
              )}
              <div style={style.productName}>{promo.titulo}</div>
              <div style={style.productDesc}>{promo.descripcion}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSucursales = () => (
    <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaMapMarkerAlt /> {t('locations.title', 'Our Locations')}
      </h2>
      <div style={{ ...style.productCard(tema), marginBottom: 16, padding: 24 }}>
         <div style={style.productName}>{t('locations.mainBranch', 'Main Branch')}</div>
         <div style={{...style.productDesc, marginBottom: 8}}>
           {t('locations.mainAddress', 'Tech Avenue 123, Mexico City')}
         </div>
         <div style={style.productDesc}>
           <strong>{t('locations.hours', 'Hours')}:</strong> {t('locations.hoursDetail', 'Mon-Fri 9am - 8pm | Sat-Sun 10am - 6pm')}
         </div>
         <div style={style.productDesc}>
           <strong>{t('locations.phone', 'Phone')}:</strong> 55-1234-5678
         </div>
      </div>
    </div>
  );

  const renderNosotros = () => (
    <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaInfoCircle /> {t('about.title', 'About Us')}
      </h2>
      <p style={style.productDesc}>
        {t('about.p1', 'SuperTech is a leader in retail solutions integrating the best technology with fresh products to offer a unique shopping experience.')}
      </p>
      <p style={style.productDesc}>
        {t('about.p2', 'We combine innovation with quality to bring you the best of both worlds: cutting-edge technology and daily essentials.')}
      </p>
    </div>
  );

  const renderContacto = () => (
     <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaPhone /> {t('contact.title', 'Contact')}
      </h2>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20, maxWidth: 600 }}>
        <input 
          type="text" 
          placeholder={t('contact.name', 'Your Name')} 
          style={{padding: 12, borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.fondo, color: tema.texto}} 
        />
        <input 
          type="email" 
          placeholder={t('contact.email', 'Your Email')} 
          style={{padding: 12, borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.fondo, color: tema.texto}} 
        />
        <textarea 
          placeholder={t('contact.message', 'Your Message...')} 
          rows="5" 
          style={{padding: 12, borderRadius: 8, border: `1px solid ${tema.borde}`, background: tema.fondo, color: tema.texto}}
        ></textarea>
        <button 
          type="submit" 
          style={{ padding: '12px 24px', background: tema.primario, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
        >
          {t('contact.send', 'Send Message')}
        </button>
      </form>
    </div>
  );

  const renderMainContent = () => {
    if (loading) return renderLoading();

    switch (activeSection) {
      case 'inicio': return renderInicio();
      case 'productos': return renderProductos();
      case 'promociones': return renderPromociones();
      case 'sucursales': return renderSucursales();
      case 'nosotros': return renderNosotros();
      case 'contacto': return renderContacto();
      default: return renderInicio();
    }
  };
  
  const renderFooter = () => (
    <footer style={style.footer(tema)}>
      {t('footer.text', 'SuperTech S.A. de C.V. © 2025. All rights reserved.')}
    </footer>
  );

  return (
    <div style={style.layout(tema)}>
      {renderHeader()}
      {renderNav()}
      <main style={style.main}>
        {renderMainContent()}
      </main>
      {renderFooter()}
    </div>
  );
}