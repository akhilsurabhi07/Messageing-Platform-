import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.broadcasthub.app',
  appName: 'BroadcastHub',
  webDir: 'dist',
  server: {
    url: 'https://broadcasthub-v1-akhil.web.app',
    cleartext: true
  }
};

export default config;
