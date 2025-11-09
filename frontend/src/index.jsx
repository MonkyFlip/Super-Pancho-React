import React, { Suspense } from 'react'; // <-- 1. IMPORTAR SUSPENSE
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n.js'; // <-- 2. IMPORTAR TU CONFIGURACIÓN

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 3. ENVOLVER APP EN SUSPENSE */}
    <Suspense fallback="Cargando...">
      <App />
    </Suspense>
  </React.StrictMode>
);