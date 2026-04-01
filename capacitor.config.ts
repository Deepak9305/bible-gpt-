import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biblenova.app',
  appName: 'Bible Nova',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: '1083543499729-erfr5o5fis936tqh1p136uvtojgkl205.apps.googleusercontent.com',
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
  }
};

export default config;
