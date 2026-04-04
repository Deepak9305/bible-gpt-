import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biblenova.app',
  appName: 'Bible Nova',
  webDir: 'dist',
  plugins: {
    // Google Auth configuration has been removed. 
    // Capgo configures the client IDs via code in nativeService.ts
    SplashScreen: {
      launchShowDuration: 0, // We handle our own animated splash in React
      backgroundColor: '#1e3a5f',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#3B82F6',
    },
  },
  server: {
    url: 'https://biblenova.vercel.app/',
    cleartext: true
  }
};

export default config;
