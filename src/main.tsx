import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Capacitor } from '@capacitor/core';

// Dynamically inject cordova.js for native platforms to enable Cordova plugins
// (like CdvPurchase) even when loading a remote URL in Web Wrapper mode.
//
// IMPORTANT: When capacitor.config.ts has a `server.url` pointing to a remote host
// (e.g. Vercel), the WebView loads from that origin. A relative `src='cordova.js'`
// would resolve to the remote URL (which doesn't have cordova.js) and silently 404,
// causing the entire Cordova bridge to never initialize.
//
// The fix: always load cordova.js from the Capacitor native LOCAL server, which is
// the only place the file actually exists.
//   Android: https://localhost/cordova.js
//   iOS:     capacitor://localhost/cordova.js
if (Capacitor.isNativePlatform()) {
  const localOrigin = Capacitor.getPlatform() === 'ios'
    ? 'capacitor://localhost'
    : 'https://localhost';
  const script = document.createElement('script');
  script.src = `${localOrigin}/cordova.js`;
  document.head.appendChild(script);
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
