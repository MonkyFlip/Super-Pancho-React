import React, { useState, useEffect } from 'react';
import './MediaGallery.css'; // Importaremos un CSS simple

// URL base de tu API de Flask
const API_BASE_URL = 'http://127.0.0.1:5000';
const PAGE_LIMIT = 12; // Cuántos items mostrar por página

function MediaGallery({ tipo }) {
  // --- Estados del Componente ---
  const [items, setItems] = useState([]); // Almacena los archivos (fotos/videos)
  const [isLoading, setIsLoading] = useState(false); // Para mostrar un "Cargando..."
  const [error, setError] = useState(null); // Para mostrar errores
  
  // --- Estados de Paginación ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // --- Efecto para Cargar Datos ---
  // Se ejecuta cada vez que 'tipo' o 'currentPage' cambian
  useEffect(() => {
    const fetchMedia = async () => {
      setIsLoading(true);
      setError(null);
      
      const url = `${API_BASE_URL}/multimedia/archivos?tipo=${tipo}&page=${currentPage}&limit=${PAGE_LIMIT}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudo conectar a la API`);
        }
        
        const data = await response.json();
        
        if (data.ok) {
          setItems(data.archivos);
          setTotalPages(data.pagination.total_pages);
          setTotalCount(data.pagination.total_count);
        } else {
          throw new Error(data.error || "Error al obtener los datos");
        }
        
      } catch (err) {
        setError(err.message);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, [tipo, currentPage]); // Dependencias: re-ejecutar si cambian

  // --- Manejadores de Paginación ---
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // --- Renderizado del Componente ---
  
  // 1. Mostrar estado de Carga
  if (isLoading) {
    return <div className="media-loader">Cargando {tipo}s...</div>;
  }

  // 2. Mostrar estado de Error
  if (error) {
    return <div className="media-error">Error: {error}</div>;
  }
  
  // 3. Mostrar si no hay resultados
  if (items.length === 0) {
    return <div className="media-empty">No se encontraron {tipo}s.</div>;
  }

  // 4. Renderizado principal (la galería)
  return (
    <div className="media-gallery-container">
      <h3>{`Galería de ${tipo}s`} <small>({totalCount} total)</small></h3>
      
      {/* --- Controles de Paginación --- */}
      <div className="pagination-controls">
        <button onClick={handlePrevPage} disabled={currentPage === 1}>
          Anterior
        </button>
        <span>
          Página {currentPage} de {totalPages}
        </span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages}>
          Siguiente
        </button>
      </div>
      
      {/* --- Galería de Medios --- */}
      <div className="media-grid">
        {items.map(item => {
          // Esta es la URL que va al endpoint 2 de tu API
          const fileUrl = `${API_BASE_URL}/multimedia/archivo/${item.id}`;
          
          return (
            <div key={item.id} className="media-item">
              {/* Decidimos qué etiqueta HTML usar:
                Si el tipo NO es 'video', asumimos que es 'imagen' o 'foto'
              */}
              {tipo === 'video' ? (
                <video src={fileUrl} controls preload="metadata">
                  Tu navegador no soporta videos.
                </video>
              ) : (
                <img src={fileUrl} alt={item.filename} loading="lazy" />
              )}
              <p className="media-filename" title={item.filename}>
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