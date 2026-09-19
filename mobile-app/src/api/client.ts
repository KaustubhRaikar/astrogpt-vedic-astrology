import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../config/env';

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds to give headroom for AI fallback paths
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('user_jwt_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to retrieve JWT token from SecureStore', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Check if error is an Axios error and has a response
    if (axios.isAxiosError(error) && error.response) {
      const { status } = error.response;

      if (status === 401) {
        console.warn('Session expired. Logging out...');
        try {
          // Clear secure token
          await SecureStore.deleteItemAsync('user_jwt_token');

          // Import stores dynamically to avoid circular dependencies
          const { useSessionStore } = require('../store/useSessionStore');
          useSessionStore.getState().logout();
        } catch (e) {
          console.error('Error clearing session on 401', e);
        }
      }

      if (status === 402) {
        console.warn('Insufficient tokens. Triggering paywall...');
        try {
          // Open the paywall globally
          const { useTokenStore } = require('../store/useTokenStore');
          useTokenStore.getState().setPaywallVisible(true);
        } catch (e) {
          console.error('Error triggering paywall on 402', e);
        }
      }
    } else if (!error.response) {
      console.warn(`Network Error: Unable to reach server at ${ENV.API_BASE_URL}. Ensure your phone and server computer are connected to the same Wi-Fi.`);
    }

    return Promise.reject(error);
  }
);
export default apiClient;
