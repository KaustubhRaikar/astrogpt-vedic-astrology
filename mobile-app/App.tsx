import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import PaywallModal from './src/screens/wallet/PaywallModal';
import { localCache } from './src/db/localCache';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

import * as ScreenCapture from 'expo-screen-capture';

function AppContent() {
  const { theme } = useTheme();

  useEffect(() => {
    // Spin up local SQLite offline caching tables
    localCache.initDb();

    // Restrict screenshots, screen recording, and app switcher snapshots
    const activateSecurityShield = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        // Fallback for web or dev preview
      }
    };
    activateSecurityShield();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
        {/* Global Paywall Modal - opens automatically via 402 Axios interceptor */}
        <PaywallModal />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
