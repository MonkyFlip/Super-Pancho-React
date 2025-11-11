import React, { useState, useEffect } from 'react';
import { temas } from '../../../styles/temas';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = 'http://127.0.0.1:5000';
const PAGE_LIMIT = 12;

const getStyles = (tema) => ({
  container: {
    width: '100%', 
    margin: '0 auto', 
    fontFamily: 'Arial, sans-serif',
  },
  h3: {
    textAlign: 'center', 
    fontSize: '1.5rem', 
    textTransform: 'capitalize',
    color: tema.texto, 
    margin: '0 0 1rem 0',
  },
  small: {
    fontSize: '0.9rem', 
    color: '#666', 
    fontWeight: 'normal',
  },
  grid: {
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', // CORREGIDO: sin espacio extra
    gap: '20px', 
    marginTop: '1rem',
  },
  item: {
    border: `1px solid ${tema.borde}`, 
    borderRadius: 8,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
    overflow: 'hidden', 
    background: '#fff',
  },
  media: {
    width: '100%', 
    height: '250px', 
    objectFit: 'cover',
    display: 'block', 
    background: '#f0f0f0',
  },
  filename: {
    padding: '10px 12px', 
    fontSize: '0.85rem', 
    color: '#555',
    whiteSpace: 'nowrap', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis',
    margin: 0, 
    textAlign: 'center', 
    background: '#fcfcfc',
    borderTop: `1px solid ${tema.borde}`,
  },
  paginationControls: {
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: '1rem', 
    margin: '1.5rem 0 1rem 0',
  },
  pageInfo: {
    fontSize: '1rem', 
    color: tema.texto, 
    fontWeight: 'bold',
  },
  button: {
    padding: '8px 16px', 
    border: `1px solid ${tema.primario}`,
    background: tema.primario, 
    color: 'white', 
    borderRadius: 5,
    cursor: 'pointer', 
    fontWeight: 'bold',
    boxShadow: `0 8px 18px ${tema.acento}22`,
  },
  buttonDisabled: {
    padding: '8px 16px', 
    border: `1px solid ${tema.borde}`,
    background: tema.borde, 
    color: '#999', 
    borderRadius: 5,
    cursor: 'not-allowed', 
    fontWeight: 'bold',
  },
  loader: {
    textAlign: 'center', 
    fontSize: '1.2rem', 
    padding: '2rem', 
    color: '#888',
  },
  error: {
    textAlign: 'center', 
    fontSize: '1.2rem', 
    padding: '2rem', 
    color: tema.acento,
  }
});

function MediaGallery({ tipo, tema }) {
  const { t } = useTranslation();
  const t_tema = tema || temas.bosque_claro;
  const styles = getStyles(t_tema);

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const typeKey = {
    foto: 'photo',
    imagen: 'image',
    video: 'video'
  }[tipo] || 'image';
  
  const translatedTypePlural = t(`media.types.${typeKey}_plural`);

  useEffect(() => {
    const fetchMedia = async () => {
      setIsLoading(true);
      setError(null);
      
      const url = `${API_BASE_URL}/multimedia/archivos?tipo=${tipo}&page=${currentPage}&limit=${PAGE_LIMIT}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(t('media.errors.apiConnect', `Error ${response.status}: No se pudo conectar a la API`));
        }
        
        const data = await response.json();
        
        if (data.ok) {
          setItems(data.archivos);
          setTotalPages(data.pagination.total_pages);
          setTotalCount(data.pagination.total_count);
        } else {
          throw new Error(data.error || t('media.errors.fetch', "Error al obtener los datos"));
        }
        
      } catch (err) {
        setError(err.message);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, [tipo, currentPage, t]);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  if (isLoading) {
    return <div style={styles.loader}>{t('media.gallery.loading', { type: translatedTypePlural })}</div>;
  }

  if (error) {
    return <div style={styles.error}>{t('media.gallery.error', { error: error })}</div>;
  }
  
  if (items.length === 0) {
    return <div style={styles.loader}>{t('media.gallery.notFound', { type: translatedTypePlural })}</div>;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.h3}>
        {t('media.gallery.title', { type: translatedTypePlural })} 
        <small style={styles.small}> {t('media.gallery.total', { count: totalCount })}</small>
      </h3>
      
      <div style={styles.paginationControls}>
        <button 
          onClick={handlePrevPage} 
          disabled={currentPage === 1}
          style={currentPage === 1 ? styles.buttonDisabled : styles.button}
        >
          {t('media.pagination.previous')}
        </button>
        <span style={styles.pageInfo}>
          {t('media.pagination.pageInfo', { currentPage, totalPages })}
        </span>
        <button 
          onClick={handleNextPage} 
          disabled={currentPage === totalPages}
          style={currentPage === totalPages ? styles.buttonDisabled : styles.button}
        >
          {t('media.pagination.next')}
        </button>
      </div>
      
      <div style={styles.grid}>
        {items.map(item => {
          const fileUrl = `${API_BASE_URL}/multimedia/archivo/${item.id}`;
          
          return (
            <div key={item.id} style={styles.item}>
              {tipo === 'video' ? (
                <video src={fileUrl} controls preload="metadata" style={styles.media}>
                  {t('media.video.fallback')}
                </video>
              ) : (
                <img src={fileUrl} alt={item.filename} loading="lazy" style={styles.media} />
              )}
              <p style={styles.filename} title={item.filename}>
                {item.filename}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MediaGallery;