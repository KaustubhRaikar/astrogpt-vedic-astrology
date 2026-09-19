import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../../components/Button';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type FailureRouteProp = RouteProp<RootStackParamList, 'PurchaseFailure'>;

export const PurchaseFailureScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<FailureRouteProp>();

  const planId = (route.params as any)?.planId || 'constellation';
  const errorMessage = (route.params as any)?.errorMessage || 'Your card was declined by simulated test bank.';

  const handleRetry = () => {
    // Navigate back to Checkout, replacing failure in stack to prevent back-looping
    navigation.replace('MockCheckout' as any, { planId });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Test mode banner */}
      <View style={styles.testBanner}>
        <AlertCircle size={14} color="#FFF" style={{ marginRight: 6 }} />
        <Text style={styles.testBannerText}>TEST MODE — NO REAL CHARGES WILL OCCUR</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.errorCircle, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
          <ShieldAlert size={60} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.sizes.xxl, fontFamily: typography.fonts.heading }]}>
          Transaction Declined
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.md, fontFamily: typography.fonts.body }]}>
          {errorMessage}
        </Text>

        {/* Informative advice box */}
        <View style={[styles.adviceBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.adviceTitle, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodySemibold }]}>
            Simulated Sandbox Tip:
          </Text>
          <Text style={[styles.adviceText, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginTop: 4 }]}>
            Avoid using credit card numbers ending in 0000. Try any other valid card number format, or end in 4242 to trigger a successful sandbox transaction.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Try Again"
            onPress={handleRetry}
            icon={<RefreshCw size={18} color={colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C'} />}
            style={styles.actionButton}
          />
          <Button
            title="Cancel Purchase"
            variant="ghost"
            onPress={() => {
              navigation.popToTop(); // Back to MainTabs
              navigation.navigate('Main'); // Ensure we are on MainTabs
            }}
            style={styles.cancelButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  testBanner: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    zIndex: 99,
  },
  testBannerText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 28,
  },
  adviceBox: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 36,
  },
  adviceTitle: {
    fontWeight: 'bold',
  },
  adviceText: {
    lineHeight: 18,
  },
  buttonRow: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  },
});
export default PurchaseFailureScreen;
