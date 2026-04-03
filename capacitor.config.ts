import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biblenova.app',
  appName: 'Bible Nova',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: '1083543499729-6h6e96849m3nn9qe8ir4ugc21djr1rlu.apps.googleusercontent.com',
      clientId: '1083543499729-3rrelit5mm4jno7jfogpnaceh9inlgu4.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
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
