import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  // Carga traducciones usando http backend 
  // (desde /public/locales)
  .use(HttpApi)
  
  // Detecta el idioma del usuario
  .use(LanguageDetector)
  
  // Pasa la instancia de i18n a react-i18next
  .use(initReactI18next)
  
  // Configuración inicial
  .init({
    // Idiomas que vas a soportar
    supportedLngs: ['en', 'es', 'pt'],
    
    // Idioma de respaldo (si el navegador usa un idioma 
    // que no soportas, usará este)
    fallbackLng: 'es',
    
    // Dónde buscar los archivos JSON
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    
    // Opciones para react-i18next
    react: {
      // Suspense es necesario para la carga asíncrona
      useSuspense: true, 
    },

    // Opcional: activa logs en la consola para depuración
    debug: true, 

    interpolation: {
      escapeValue: false, // React ya se encarga de esto
    },
  });

export default i18n;