/**
 * Production & Development API Configuration for AstroGPT
 */
const getDevHost = (): string => {
  try {
    const Constants = require('expo-constants').default || require('expo-constants');
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch (e) {
    // Ignore require error if bundler is caching
  }
  return '192.168.0.102'; // Fallback local Wi-Fi IP address
};

const devHost = getDevHost();

export const ENV = {
  // Production URL default with fallback override capability via EXPO_PUBLIC_API_URL
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://astro.aarambhtech.in',
  IS_DEV: __DEV__,
};

export default ENV;

