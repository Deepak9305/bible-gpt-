import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.biblenova.app',
  appName: 'Bible Nova',
  webDir: 'dist',
  plugins: {
    // Google Auth configuration has been removed. 
    // Capgo configures the client IDs via code in nativeService.ts
    SplashScreen: {
      launchShowDuration: 0, // We handle our own animated splash in React
      backgroundColor: '#EFF6FF',
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
  // Production builds use the bundled dist/ assets. Set this only for live reload.
  ...(liveReloadUrl
    ? {
      server: {
        url: liveReloadUrl,
        cleartext: liveReloadUrl.startsWith('http://'),
      },
    }
    : {}),
};

export default config;
