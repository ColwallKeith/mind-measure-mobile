import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindmeasure.mobile',
  appName: 'Mind Measure',
  webDir: 'dist',
  // iOS loads FROM mobile.mindmeasure.app (Vercel deployment) per DEVELOPMENT_PROTOCOL.md
  // This ensures the app always has the latest code and can be updated without app store releases
  server: {
    url: 'https://mobile.mindmeasure.app?v=' + Date.now(),
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
