import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

/**
 * O app é publicado numa subpasta no GitHub Pages (/monkey-finance/), então o
 * router precisa do basename: sem ele, qualquer navigate('/login') ou NavLink
 * sai na raiz do domínio e a navegação quebra fora da base.
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

/**
 * PWA: registra o service worker só no build de produção (em dev ele serviria
 * arquivos antigos do cache e atrapalharia o HMR).
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Avaliado antes do registro: se a página já era controlada por um SW, uma
  // versão nova assumindo o controle exige reload. Na primeira visita não,
  // senão a página recarregaria sozinha logo após o install.
  const pageWasControlled = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !pageWasControlled) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((error) =>
        console.error('Falha ao registrar o service worker:', error),
      );
  });
}
