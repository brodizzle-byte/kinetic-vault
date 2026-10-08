import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kineticvault.game',
  appName: 'Kinetic Vault',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#0a0b0e',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0b0e',
      showSpinner: false,
      androidSplashResourceName: 'splash'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0b0e'
    }
  }
};

export default config;
