import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindmeasure.mobile',
  appName: 'Mind Measure',
  webDir: 'dist',
  server: {
    url: 'https://mobile.mindmeasure.app',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: "none", // We'll handle keyboard layout manually
      style: "dark",
      resizeOnFullScreen: true
    }
  }
};

export default config;
