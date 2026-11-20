import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/global.css';
import './styles/utilities.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Progressive Web App (PWA) Service Worker in production only
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.warn('PWA service worker registration failed:', err);
        });
    });
  } else {
    // Unregister any stale worker in development
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    caches.keys().then((keys) => {
      for (const key of keys) caches.delete(key);
    });
  }
}
