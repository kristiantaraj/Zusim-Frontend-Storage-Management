import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
if (window.location.protocol === 'http:' && !isLocalHost) {
  const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
  console.warn('[HTTPS] Redirecting to secure origin:', httpsUrl);
  window.location.replace(httpsUrl);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
