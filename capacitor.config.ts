import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindmeasure.mobile',
  appName: 'Mind Measure',
  webDir: 'dist',
  // NOTE: server.url is NOT used for iOS production builds per DEVELOPMENT_PROTOCOL.md
  // iOS loads from local webDir files with environment variables baked into the build
  plugins: {
    Keyboard: {
      resize: "none", // We'll handle keyboard layout manually
      style: "dark",
      resizeOnFullScreen: true
    }
  }
};

export default config;
