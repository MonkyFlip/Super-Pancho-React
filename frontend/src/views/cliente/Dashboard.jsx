// src/views/public/ClientePortal.jsx
import React, { useState, useEffect } from 'react';
import { temas } from '../../styles/temas';
import { useTranslation } from 'react-i18next';
import { isAuthenticated, getStoredUser, logout } from '../../services/auth';
import CambioTema from '../../components/CambioTema';
import CambioIdioma from '../../components/CambioIdioma';

// Iconos para las secciones y la UI
import { 
  FaStore, FaBookOpen, FaTags, FaMapMarkerAlt, FaInfoCircle, FaPhone, 
  FaSignInAlt, FaSignOutAlt, FaUser, FaSearch, FaChevronRight 
} from 'react-icons/fa';

const THEME_KEY = 'app_theme_selected';

// ==================== DATOS DE EJEMPLO ====================

const MOCK_CATEGORIAS = [
  { id: 'abarrotes', nombre: 'Abarrotes', icon: '🛒' },
  { id: 'electronica', nombre: 'Electrónica', icon: '💻' },
  { id: 'hogar', nombre: 'Hogar', icon: '🏠' },
  { id: 'ropa', nombre: 'Ropa', icon: '👕' },
];

const MOCK_PRODUCTOS = [
  { id: 1, categoria: 'abarrotes', nombre: 'Arroz Súper Grano', precio: 20.00, descripcion: 'Bolsa de 1kg de arroz blanco de grano largo.', imagen: 'https://via.placeholder.com/300x200.png?text=Arroz' },
  { id: 2, categoria: 'abarrotes', nombre: 'Aceite Vegetal', precio: 35.00, descripcion: 'Botella de 1L de aceite vegetal puro.', imagen: 'https://via.placeholder.com/300x200.png?text=Aceite' },
  { id: 3, categoria: 'electronica', nombre: 'Laptop Gamer X', precio: 2340.00, descripcion: 'Laptop con especificaciones de alta gama para juegos.', imagen: 'https://via.placeholder.com/300x200.png?text=Laptop+Gamer' },
  { id: 4, categoria: 'electronica', nombre: 'Smartphone Pro', precio: 1890.00, descripcion: 'El último smartphone con cámara de 108MP.', imagen: 'https://via.placeholder.com/300x200.png?text=Smartphone' },
  { id: 5, categoria: 'hogar', nombre: 'Juego de Sartenes', precio: 850.00, descripcion: 'Set de 3 sartenes de teflón antiadherente.', imagen: 'https://via.placeholder.com/300x200.png?text=Sartenes' },
  { id: 6, categoria: 'ropa', nombre: 'Camisa de Lino', precio: 450.00, descripcion: 'Camisa fresca de lino, ideal para clima cálido.', imagen: 'https://via.placeholder.com/300x200.png?text=Camisa' },
];

const MOCK_PROMOCIONES = [
  { id: 1, titulo: '¡Oferta de Verano!', descripcion: '20% de descuento en toda la categoría de Ropa.', insight: false },
  { id: 2, titulo: 'Paquete Electrónico', descripcion: 'Compra una Laptop Gamer X y llévate un Teclado Mecánico con 50% de descuento.', insight: true },
  { id: 3, titulo: 'Canasta Básica', descripcion: '10% de descuento en la compra de Arroz, Aceite y Leche.', insight: false },
];

const MOCK_SUCURSALES = [
  { id: 1, nombre: 'Sucursal Centro', direccion: 'Av. Siempre Viva 123, Centro', horario: 'L-V: 9am - 8pm | S-D: 10am - 6pm', telefono: '55-1234-5678' },
  { id: 2, nombre: 'Sucursal Norte', direccion: 'Calle Falsa 456, Col. Norte', horario: 'L-V: 8am - 7pm | S: 10am - 4pm', telefono: '55-9876-5432' },
];

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
  // --- Navegación Principal ---
  nav: (tema) => ({
    display: 'flex',
    justifyContent: 'center',
    background: tema.fondo_card + '80', // Un poco transparente
    backdropFilter: 'blur(5px)',
    borderBottom: `1px solid ${tema.borde}`,
    padding: '0 24px',
    position: 'sticky',
    top: 73, // Altura del header
    zIndex: 99,
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
    '&:hover': {
      color: tema.primario,
      background: tema.borde,
    }
  }),
  // --- Contenido Principal ---
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
  // --- Componentes Específicos ---
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
  },
  // --- Footer ---
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
  
  // --- Estados ---
  const [temaKey, setTemaKey] = useState(localStorage.getItem(THEME_KEY) || 'bosque_claro');
  const [authenticated, setAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio'); // 'inicio', 'productos', 'promociones', ...
  const [selectedCategoria, setSelectedCategoria] = useState('todos');

  const tema = temas[temaKey];

  // --- Efectos ---
  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);
  
  // --- Manejadores de Eventos ---
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
    setAuthenticated(false);
    // Opcional: redirigir a la página de inicio
    setActiveSection('inicio');
  };
  
  const handleLogin = () => {
    // Redirige a la vista de login de tu aplicación
    window.location.hash = '#/login';
  };

  const handleNavClick = (section) => {
    setActiveSection(section);
    // Si van a productos, resetear categoría
    if (section === 'productos') {
      setSelectedCategoria('todos');
    }
  };

  // ==================== SUB-COMPONENTES DE RENDERIZADO ====================

  /**
   * 1. HEADER: Controles de Tema, Idioma y Sesión
   */
  const renderHeader = () => (
    <header style={style.header(tema)}>
      <div style={style.headerTitle(tema)}>
        <FaStore />
        <span>{t('clientPortal.title', 'Portal del Cliente')}</span>
      </div>
      
      <div style={style.headerControls}>
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
        
        {authenticated ? (
          <>
            <div style={style.userInfo(tema)}>
              <FaUser />
              <span>{getStoredUser()?.usuario || 'Cliente'}</span>
            </div>
            <button
              onClick={handleLogout}
              style={style.iconButton(tema)}
              title={t('logout', 'Cerrar sesión')}
            >
              <FaSignOutAlt />
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            style={style.iconButton(tema)}
            title={t('login', 'Iniciar sesión')}
          >
            <FaSignInAlt />
          </button>
        )}
      </div>
    </header>
  );

  /**
   * 2. NAVEGACIÓN: Links a secciones
   */
  const renderNav = () => (
    <nav style={style.nav(tema)}>
      {[
        { key: 'inicio', label: t('nav.home', 'Inicio'), icon: <FaStore /> },
        { key: 'productos', label: t('nav.products', 'Productos'), icon: <FaBookOpen /> },
        { key: 'promociones', label: t('nav.promos', 'Promociones'), icon: <FaTags /> },
        { key: 'sucursales', label: t('nav.locations', 'Sucursales'), icon: <FaMapMarkerAlt /> },
        { key: 'nosotros', label: t('nav.about', 'Nosotros'), icon: <FaInfoCircle /> },
        { key: 'contacto', label: t('nav.contact', 'Contacto'), icon: <FaPhone /> },
      ].map((item) => (
        <a 
          key={item.key}
          style={style.navLink(tema, activeSection === item.key)}
          onClick={() => handleNavClick(item.key)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );

  /**
   * 3. CONTENIDO: Sección de Inicio (Hero Banner)
   */
  const renderInicio = () => (
    <div style={style.section(tema)}>
      <div style={style.heroBanner(tema)}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{t('home.welcome', 'Bienvenido a Nuestra Tienda')}</h1>
        <p style={{ fontSize: 18, opacity: 0.9, marginTop: 12 }}>{t('home.subtitle', 'Explora nuestro catálogo, conoce nuestras ofertas y visítanos.')}</p>
      </div>
      {/* Aquí podrías agregar accesos rápidos */}
    </div>
  );
  
  /**
   * 4. CONTENIDO: Sección de Productos
   */
  const renderProductos = () => {
    const productosFiltrados = selectedCategoria === 'todos' 
      ? MOCK_PRODUCTOS 
      : MOCK_PRODUCTOS.filter(p => p.categoria === selectedCategoria);
      
    return (
      <div style={style.section(tema)}>
        <h2 style={style.sectionTitle(tema)}>
          <FaBookOpen /> {t('products.title', 'Catálogo de Productos')}
        </h2>
        
        {/* Filtros de Categoría */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button 
            style={style.navLink(tema, selectedCategoria === 'todos')}
            onClick={() => setSelectedCategoria('todos')}
          >
            {t('products.all', 'Todos')}
          </button>
          {MOCK_CATEGORIAS.map(cat => (
            <button 
              key={cat.id}
              style={style.navLink(tema, selectedCategoria === cat.id)}
              onClick={() => setSelectedCategoria(cat.id)}
            >
              {cat.icon} {cat.nombre}
            </button>
          ))}
        </div>
        
        {/* Grid de Productos */}
        <div style={style.productGrid}>
          {productosFiltrados.map(p => (
            <div key={p.id} style={style.productCard(tema)}>
              <img src={p.imagen} alt={p.nombre} style={style.productImage} />
              <div style={style.productInfo}>
                <div style={style.productName}>{p.nombre}</div>
                <div style={style.productPrice(tema)}>${p.precio.toFixed(2)}</div>
                <div style={style.productDesc}>{p.descripcion}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * 5. CONTENIDO: Sección de Promociones (Conexión con Spark)
   */
  const renderPromociones = () => (
    <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaTags /> {t('promos.title', 'Promociones Especiales')}
      </h2>
      <div style={style.productGrid}> {/* Reutilizamos el grid */}
        {MOCK_PROMOCIONES.map(promo => (
          <div 
            key={promo.id}
            style={{ 
              ...style.productCard(tema), 
              background: promo.insight ? `linear-gradient(45deg, ${tema.primario}20, ${tema.fondo})` : tema.fondo,
              border: promo.insight ? `2px solid ${tema.primario}` : `1px solid ${tema.borde}`,
            }}
          >
            <div style={style.productInfo}>
              {promo.insight && (
                <div style={{ fontSize: 12, fontWeight: 700, color: tema.primario, marginBottom: 8 }}>
                  🔥 {t('promos.spark', 'INSIGHT RECOMENDADO')}
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

  /**
   * 6. CONTENIDO: Otras secciones (Placeholder)
   */
  const renderSucursales = () => (
    <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaMapMarkerAlt /> {t('locations.title', 'Nuestras Sucursales')}
      </h2>
      {MOCK_SUCURSALES.map(s => (
        <div key={s.id} style={{ ...style.productCard(tema), marginBottom: 16 }}>
          <div style={style.productInfo}>
            <div style={style.productName}>{s.nombre}</div>
            <div style={{...style.productDesc, color: tema.texto, marginBottom: 8 }}>{s.direccion}</div>
            <div style={{...style.productDesc, fontSize: 13, marginBottom: 4 }}><b>{t('locations.hours', 'Horario')}:</b> {s.horario}</div>
            <div style={{...style.productDesc, fontSize: 13 }}><b>{t('locations.phone', 'Teléfono')}:</b> {s.telefono}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderNosotros = () => (
    <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaInfoCircle /> {t('about.title', 'Sobre Nosotros')}
      </h2>
      <p style={style.productDesc}>{t('about.p1', 'Somos una empresa dedicada a ofrecer los mejores productos a los mejores precios. Nuestra misión es...')}</p>
      <br />
      <p style={style.productDesc}>{t('about.p2', 'Fundada en 2020, hemos crecido gracias a la confianza de nuestros clientes...')}</p>
    </div>
  );

  const renderContacto = () => (
     <div style={style.section(tema)}>
      <h2 style={style.sectionTitle(tema)}>
        <FaPhone /> {t('contact.title', 'Contacto')}
      </h2>
      <p style={style.productDesc}>{t('contact.p1', '¿Tienes dudas o sugerencias? ¡Contáctanos!')}</p>
      {/* Aquí iría un formulario, pero por ahora es solo layout */}
      <form style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
        <input type="text" placeholder={t('contact.name', 'Tu Nombre')} style={style.navLink(tema)} />
        <input type="email" placeholder={t('contact.email', 'Tu Correo')} style={style.navLink(tema)} />
        <textarea placeholder={t('contact.message', 'Tu Mensaje...')} style={style.navLink(tema)} rows="5"></textarea>
        <button type="submit" style={{ ...style.navLink(tema, true), width: 'fit-content', borderBottomWidth: 0, borderRadius: 8 }}>
          {t('contact.send', 'Enviar Mensaje')}
        </button>
      </form>
    </div>
  );


  /**
   * 7. CONTENIDO: Selector principal
   */
  const renderMainContent = () => {
    switch (activeSection) {
      case 'inicio':
        return renderInicio();
      case 'productos':
        return renderProductos();
      case 'promociones':
        return renderPromociones();
      case 'sucursales':
        return renderSucursales();
      case 'nosotros':
        return renderNosotros();
      case 'contacto':
        return renderContacto();
      default:
        return renderInicio();
    }
  };
  
  /**
   * 8. FOOTER
   */
  const renderFooter = () => (
    <footer style={style.footer(tema)}>
      {t('footer.text', 'Mi Empresa S.A. de C.V. © 2025. Todos los derechos reservados.')}
    </footer>
  );

  // ==================== RENDER FINAL ====================
  
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