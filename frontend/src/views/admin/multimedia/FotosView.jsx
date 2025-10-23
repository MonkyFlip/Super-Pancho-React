import React, { useState, useEffect } from 'react';
import MediaGallery from './MediaGallery';
import { temas } from '../../../styles/temas';

// Copiamos la lógica de carga de Tema de DashboardU.jsx
const THEME_KEY = 'app_theme_selected';
const POLL_THEME_MS = 700;

function FotosView() {
  const [temaKey, setTemaKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
  const tema = temas[temaKey] || temas.bosque_claro;

  // Efecto para 'escuchar' cambios de tema en otras pestañas
  useEffect(() => {
    let last = temaKey;
    const interval = setInterval(() => {
      try {
        const now = localStorage.getItem(THEME_KEY) || 'bosque_claro';
        if (now !== last) {
          last = now;
          setTemaKey(now);
        }
      } catch {}
    }, POLL_THEME_MS);
    return () => clearInterval(interval);
  }, [temaKey]);

  return (
    <div>
      {/* Pasamos el tema al componente de galería */}
      <MediaGallery tipo="foto" tema={tema} />
    </div>
  );
}

export default FotosView;