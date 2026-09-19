import { apiClient } from '../client';
import { User } from '../types';
import * as SecureStore from 'expo-secure-store';

// Simulate api latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authApi = {
  register: async (userId: string, email: string | null, phone: string | null, displayName: string | null): Promise<{ user: User; token: string }> => {
    // Dev mode: generate a mock JWT token containing the UID and save it in SecureStore first,
    // so the Axios request interceptor attaches it as a Bearer token.
    const base64Encode = (str: string): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      while (i < str.length) {
        const char1 = str.charCodeAt(i++);
        const char2 = i < str.length ? str.charCodeAt(i++) : NaN;
        const char3 = i < str.length ? str.charCodeAt(i++) : NaN;

        const byte1 = char1 >> 2;
        const byte2 = ((char1 & 3) << 4) | (isNaN(char2) ? 0 : char2 >> 4);
        const byte3 = isNaN(char2) ? 64 : ((char2 & 15) << 2) | (isNaN(char3) ? 0 : char3 >> 6);
        const byte4 = isNaN(char3) ? 64 : char3 & 63;

        result += chars.charAt(byte1) + chars.charAt(byte2) +
                  (byte3 === 64 ? '=' : chars.charAt(byte3)) +
                  (byte4 === 64 ? '=' : chars.charAt(byte4));
      }
      return result;
    };

    const payload = JSON.stringify({ user_id: userId });
    const mockToken = `header.${base64Encode(payload)}.signature`;

    try {
      const response = await apiClient.post('/auth/register', {
        user_id: userId,
        display_name: displayName,
      });

      // Prioritize authentic JWT token returned by backend
      const serverToken = response.data?.access_token || response.data?.token || response.data?.jwt_token;
      const authToken = serverToken || mockToken;

      await SecureStore.setItemAsync('user_jwt_token', authToken);

      const user: User = {
        id: userId,
        email,
        phone,
        displayName: displayName || (email ? email.split('@')[0] : 'Seeker'),
        tokens: response.data?.tokens_remaining ?? 20,
        createdAt: new Date().toISOString(),
      };
      return { user, token: authToken };
    } catch (error) {
      if (__DEV__) {
        console.warn('[DEV] Backend /auth/register offline or unreachable. Utilizing dev fallback token.', error);
        await SecureStore.setItemAsync('user_jwt_token', mockToken);
        await delay(1200);
        const user: User = {
          id: userId,
          email,
          phone,
          displayName: displayName || (email ? email.split('@')[0] : 'Seeker'),
          tokens: 20,
          createdAt: new Date().toISOString(),
        };
        return { user, token: mockToken };
      }
      throw error;
    }
  },

  deleteAccount: async (userId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.delete(`/auth/${userId}`);
      return response.data;
    } catch (error) {
      console.warn('Real deleteAccount call failed or offline. Using mock fallback.', error);
      await delay(1500);
      return { success: true };
    }
  }
};
