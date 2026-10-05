import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSessionStore } from '../store/useSessionStore';
import { RootStackParamList } from './types';

// Stack / Tab Components
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import BirthDataFormScreen from '../screens/birthData/BirthDataFormScreen';
import DocumentUploadScreen from '../screens/birthData/DocumentUploadScreen';
import LoadingState from '../components/LoadingState';
import { MockCheckoutScreen } from '../screens/wallet/MockCheckoutScreen';
import { PurchaseSuccessScreen } from '../screens/wallet/PurchaseSuccessScreen';
import { PurchaseFailureScreen } from '../screens/wallet/PurchaseFailureScreen';
import ForecastScreen from '../screens/forecast/ForecastScreen';

import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, isOnboardingSeen, isLoading, initializeSession } = useSessionStore();

  useEffect(() => {
    initializeSession();

    let subscription: Notifications.EventSubscription | null = null;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'forecast') {
          console.log('Forecast notification tapped, opening forecast screen...');
          // Triggering fresh forecast fetch for period ('week' | 'month')
        }
      });
    } catch (e) {
      // Fallback for web or non-supported platforms
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  if (isLoading) {
    return <LoadingState message="Aligning celestial orbits..." fullscreen={true} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isOnboardingSeen ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="BirthDataForm"
            component={BirthDataFormScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="DocumentUpload"
            component={DocumentUploadScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="Forecast"
            component={ForecastScreen}
          />
          <Stack.Screen
            name="MockCheckout"
            component={MockCheckoutScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="PurchaseSuccess"
            component={PurchaseSuccessScreen}
            options={{ presentation: 'modal', gestureEnabled: false }}
          />
          <Stack.Screen
            name="PurchaseFailure"
            component={PurchaseFailureScreen}
            options={{ presentation: 'modal', gestureEnabled: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
