import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../api/types';

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  isOnboardingSeen: boolean;
  isLoading: boolean;
  initializeSession: () => Promise<void>;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingSeen: (seen: boolean) => Promise<void>;
  updateUserTokens: (tokens: number) => void;
}

const ONBOARDING_SEEN_KEY = '@astro_app_onboarding_seen';

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isOnboardingSeen: false,
  isLoading: true,

  initializeSession: async () => {
    try {
      // 1. Check onboarding status
      const onboardingSeen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
      
      // 2. Check secure auth token
      const token = await SecureStore.getItemAsync('user_jwt_token');
      
      if (token) {
        // Retrieve temporary/cached user info
        const storedUser = await AsyncStorage.getItem('@astro_app_user_profile');
        if (storedUser) {
          const userObj = JSON.parse(storedUser) as User;
          set({
            user: userObj,
            isAuthenticated: true,
            isOnboardingSeen: onboardingSeen === 'true',
            isLoading: false,
          });
          return;
        }
      }

      set({
        isOnboardingSeen: onboardingSeen === 'true',
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    } catch (error) {
      console.error('Error initializing session store', error);
      set({ isLoading: false });
    }
  },

  login: async (user: User, token: string) => {
    try {
      await SecureStore.setItemAsync('user_jwt_token', token);
      await AsyncStorage.setItem('@astro_app_user_profile', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch (error) {
      console.error('Error saving login details', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('user_jwt_token');
      await AsyncStorage.removeItem('@astro_app_user_profile');
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Error during logout secure clearance', error);
    }
  },

  setOnboardingSeen: async (seen: boolean) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, seen ? 'true' : 'false');
      set({ isOnboardingSeen: seen });
    } catch (error) {
      console.error('Error setting onboarding-seen preference', error);
    }
  },

  updateUserTokens: (tokens: number) => {
    const safeTokens = typeof tokens === 'number' && !isNaN(tokens) ? tokens : 20;
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, tokens: safeTokens };
      AsyncStorage.setItem('@astro_app_user_profile', JSON.stringify(updatedUser)).catch(e => {
        console.error('Failed to update cached user tokens', e);
      });
      set({ user: updatedUser });
    }
  }
}));
