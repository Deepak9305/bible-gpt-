import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biblenova.app',
  appName: 'Bible Nova',
  webDir: 'dist',
  server: {
    url: 'https://bible-gpt-ebon.vercel.app/',
    allowNavigation: ['bible-gpt-ebon.vercel.app']
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: '1083543499729-erfr5o5fis936tqh1p136uvtojgkl205.apps.googleusercontent.com',
      clientId: '1083543499729-smnbok05h0g6gl25e3tetfokigs4edqv.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  }
};

export default config;
