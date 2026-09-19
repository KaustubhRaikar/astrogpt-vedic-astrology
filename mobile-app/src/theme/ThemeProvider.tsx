import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import { palette, ThemeColors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  toggleTheme: () => void;
  fontsLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const THEME_STORAGE_KEY = '@astro_app_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>('dark'); // Default to premium dark mode
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load custom fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Outfit-Bold': require('../../assets/fonts/Outfit-Bold.ttf'),
          'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
        });
      } catch (error) {
        console.warn('Error loading custom fonts, falling back to system fonts:', error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Hydrate theme from local storage
  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setTheme(storedTheme);
        } else if (systemColorScheme === 'light' || systemColorScheme === 'dark') {
          setTheme(systemColorScheme);
        }
      } catch (error) {
        console.error('Failed to load stored theme preference', error);
      }
    }
    loadStoredTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    try {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error('Failed to persist theme preference', error);
    }
  };

  const colors = theme === 'dark' ? palette.dark : palette.light;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        typography,
        spacing,
        toggleTheme,
        fontsLoaded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
