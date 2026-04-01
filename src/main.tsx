import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Capacitor } from '@capacitor/core';

// Dynamically inject cordova.js for native platforms to enable Cordova plugins
// (like CdvPurchase) even when loading a remote URL in Web Wrapper mode.
// This avoids Vite build errors while ensuring the native bridge is initialized.
if (Capacitor.isNativePlatform()) {
  const script = document.createElement('script');
  script.src = 'cordova.js';
  document.head.appendChild(script);
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
