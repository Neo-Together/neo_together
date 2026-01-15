import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.neotogether',
  appName: 'Neo Together',
  webDir: 'dist',
  server: {
    // For development, connect to your local backend
    // Remove or change this for production builds
    url: 'http://10.0.2.2:5173', // Android emulator localhost
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Set for release builds
      keystoreAlias: undefined,
    },
  },
};

export default config;
