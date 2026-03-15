import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biblenova.app',
  appName: 'Bible Nova',
  webDir: 'dist',
  server: {
    url: 'https://bible-gpt-ebon.vercel.app/',
    allowNavigation: ['bible-gpt-ebon.vercel.app']
  }
};

export default config;
