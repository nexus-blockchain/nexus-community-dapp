import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.community',
  appName: 'Nexus Community',
  webDir: 'out',
  server: {
    // Use HTTP scheme so that ws:// WebSocket connections (Substrate node)
    // are not blocked by mixed-content policy.
    // Capacitor 5+ defaults to https which blocks ws:// as mixed content.
    androidScheme: 'http',
  },
};

export default config;
