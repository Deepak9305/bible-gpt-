import type { CapacitorConfig } from '@capacitor/cli';

const productionAppUrl = 'https://biblenova.vercel.app';
const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL?.trim();
const useBundledAssets = process.env.CAPACITOR_USE_BUNDLED_ASSETS === 'true';
const serverUrl = liveReloadUrl || (!useBundledAssets ? productionAppUrl : '');

const config: CapacitorConfig = {
  appId: 'com.biblenova.app',
  appName: 'Bible Nova',
  webDir: 'dist',
  plugins: {
    // Keep only the native Google provider bundled on Android.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
      logLevel: 1,
    },
    SystemBars: {
      // Capacitor 8 uses this for reliable safe-area values on modern Android WebViews.
      insetsHandling: 'css',
      style: 'DEFAULT',
      hidden: false,
      animation: 'NONE',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#3B82F6',
    },
  },
  // Android loads the deployed Vercel app by default so it does not depend on
  // a missing local dist/ folder or localhost. Set CAPACITOR_USE_BUNDLED_ASSETS
  // to true when intentionally packaging a locally built dist/ directory.
  ...(serverUrl
    ? {
      server: {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
      },
    }
    : {}),
};

export default config;
