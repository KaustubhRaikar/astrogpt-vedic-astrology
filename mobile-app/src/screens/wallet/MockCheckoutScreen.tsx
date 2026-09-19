import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, CreditCard, Landmark, Wallet, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getPlanById } from '../../config/tokenPlans';
import Button from '../../components/Button';
import TextInput from '../../components/TextInput';
import Card from '../../components/Card';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type CheckoutRouteProp = RouteProp<RootStackParamList, 'MockCheckout'>;

// Luhn check helper
const validateLuhn = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\s+/g, '');
  if (!/^\d+$/.test(digits) || digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

// Form schema
const cardSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  number: z.string().min(16, 'Card number must be 16-19 digits').max(22).refine(validateLuhn, {
    message: 'Invalid card number format (Luhn check failed)',
  }),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Expiry must be MM/YY'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
});

type CardFormValues = z.infer<typeof cardSchema>;

export const MockCheckoutScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CheckoutRouteProp>();
  
  // Retrieve plan details based on param
  const planId = (route.params as any)?.planId || 'constellation';
  const plan = getPlanById(planId);

  const [payMethod, setPayMethod] = useState<'card' | 'upi' | 'wallet'>('card');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { name: '', number: '', expiry: '', cvv: '' },
  });

  const onSubmit = async (data: CardFormValues) => {
    setLoading(true);
    // Simulate network delay (1.8s)
    setTimeout(() => {
      setLoading(false);
      const cleanNum = data.number.replace(/\s+/g, '');
      
      // Deterministic card checks
      if (cleanNum.endsWith('0000')) {
        navigation.navigate('PurchaseFailure' as any, {
          planId,
          errorMessage: 'Transaction declined: Insufficient funds or card block simulated by test system.',
        });
      } else {
        navigation.navigate('PurchaseSuccess' as any, {
          planId,
          tokensCredited: plan?.tokens || 50,
        });
      }
    }, 1800);
  };

  const handleUpiPay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('PurchaseSuccess' as any, {
        planId,
        tokensCredited: plan?.tokens || 50,
      });
    }, 1800);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Test mode banner */}
      <View style={styles.testBanner}>
        <AlertCircle size={14} color="#FFF" style={{ marginRight: 6 }} />
        <Text style={styles.testBannerText}>TEST MODE — NO REAL CHARGES WILL OCCUR</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
            Secure Checkout
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Order Summary */}
          <Card variant="flat" style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Text style={[styles.summaryHeader, { color: colors.textSecondary, fontSize: 10 }]}>ORDER SUMMARY</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Sparkles size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.planName, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodyBold }]}>
                  {plan?.name || 'Vedic Plan'}
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
                {plan?.price || '₹0'}
              </Text>
            </View>
            <Text style={[styles.planDesc, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              Credits +{plan?.tokens || 0} tokens instantly to your active wallet.
            </Text>
          </Card>

          {/* Payment Method Selector */}
          <View style={[styles.tabsContainer, { backgroundColor: colors.surfaceElevated, borderRadius: spacing.borderRadius.md }]}>
            <Pressable
              style={[styles.tabButton, payMethod === 'card' && [styles.activeTab, { backgroundColor: colors.surface, borderRadius: spacing.borderRadius.sm }]]}
              onPress={() => setPayMethod('card')}
            >
              <CreditCard size={16} color={payMethod === 'card' ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, { color: payMethod === 'card' ? colors.accent : colors.textSecondary, fontSize: typography.sizes.sm }]}>Card</Text>
            </Pressable>
            <Pressable
              style={[styles.tabButton, payMethod === 'upi' && [styles.activeTab, { backgroundColor: colors.surface, borderRadius: spacing.borderRadius.sm }]]}
              onPress={() => setPayMethod('upi')}
            >
              <Landmark size={16} color={payMethod === 'upi' ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, { color: payMethod === 'upi' ? colors.accent : colors.textSecondary, fontSize: typography.sizes.sm }]}>UPI</Text>
            </Pressable>
            <Pressable
              style={[styles.tabButton, payMethod === 'wallet' && [styles.activeTab, { backgroundColor: colors.surface, borderRadius: spacing.borderRadius.sm }]]}
              onPress={() => setPayMethod('wallet')}
            >
              <Wallet size={16} color={payMethod === 'wallet' ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, { color: payMethod === 'wallet' ? colors.accent : colors.textSecondary, fontSize: typography.sizes.sm }]}>Wallet</Text>
            </Pressable>
          </View>

          {/* Payment Views */}
          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: spacing.md }} />
              <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                Authorizing mock credentials...
              </Text>
            </View>
          ) : payMethod === 'card' ? (
            <Card variant="elevated" style={styles.formCard}>
              <View style={styles.formFields}>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Cardholder Name"
                      placeholder="Jane Doe"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={error?.message}
                      autoCapitalize="words"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="number"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Card Number"
                      placeholder="4242 4242 4242 4242"
                      onBlur={onBlur}
                      onChangeText={(val) => {
                        // Format card number with spaces for visual realism
                        const clean = val.replace(/\s+/g, '').replace(/[^0-9]/g, '');
                        const formatted = clean.match(/.{1,4}/g)?.join(' ') || clean;
                        onChange(formatted);
                      }}
                      value={value}
                      error={error?.message}
                      keyboardType="numeric"
                      maxLength={19}
                    />
                  )}
                />

                <View style={styles.rowFields}>
                  <View style={{ flex: 1 }}>
                    <Controller
                      control={control}
                      name="expiry"
                      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                        <TextInput
                          label="Expiry Date"
                          placeholder="MM/YY"
                          onBlur={onBlur}
                          onChangeText={(val) => {
                            const clean = val.replace(/\//g, '').replace(/[^0-9]/g, '');
                            const formatted = clean.length > 2 ? `${clean.substring(0, 2)}/${clean.substring(2, 4)}` : clean;
                            onChange(formatted);
                          }}
                          value={value}
                          error={error?.message}
                          keyboardType="numeric"
                          maxLength={5}
                        />
                      )}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Controller
                      control={control}
                      name="cvv"
                      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                        <TextInput
                          label="CVV Code"
                          placeholder="123"
                          onBlur={onBlur}
                          onChangeText={(val) => onChange(val.replace(/[^0-9]/g, ''))}
                          value={value}
                          error={error?.message}
                          keyboardType="numeric"
                          maxLength={4}
                          secureTextEntry
                        />
                      )}
                    />
                  </View>
                </View>

                {/* Instruction tips for QA testing */}
                <View style={[styles.qaCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Text style={[styles.qaTitle, { color: colors.accent, fontSize: 11 }]}>deterministic QA TEST CARDS:</Text>
                  <Text style={[styles.qaText, { color: colors.textSecondary, fontSize: 10, marginTop: 4 }]}>
                    • End card in <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>4242</Text> (e.g. 4242 4242 4242 4242) for SUCCESS.
                  </Text>
                  <Text style={[styles.qaText, { color: colors.textSecondary, fontSize: 10, marginTop: 2 }]}>
                    • End card in <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>0000</Text> (e.g. 5200 0000 0000 0000) for DECLINE.
                  </Text>
                </View>

                <Button
                  title={`Pay ${plan?.price || ''}`}
                  onPress={handleSubmit(onSubmit)}
                  style={styles.submitButton}
                />
              </View>
            </Card>
          ) : (
            // UPI and Wallet simple stubs
            <Card variant="elevated" style={styles.formCard}>
              <View style={styles.simplePayContainer}>
                <Text style={[styles.simplePayTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                  Simulated {payMethod === 'upi' ? 'UPI Direct' : 'Wallet Direct'}
                </Text>
                <Text style={[styles.simplePayDesc, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  Tap below to launch a simulated instant transaction. No mock credentials required.
                </Text>
                <Button
                  title={`Simulate Pay ${plan?.price || ''}`}
                  onPress={handleUpiPay}
                  style={{ width: '100%', marginTop: spacing.md }}
                />
              </View>
            </Card>
          )}

          <View style={styles.securityRow}>
            <ShieldCheck size={16} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={[styles.securityText, { color: colors.textSecondary, fontSize: 11 }]}>
              SSL Encrypted simulated connection. Secure Sandbox.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  testBanner: {
    backgroundColor: '#DC2626', // Crimson red
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  testBannerText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 24,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planName: {
    fontWeight: 'bold',
  },
  planPrice: {
    fontWeight: 'bold',
  },
  planDesc: {
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 4,
    height: 48,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: 'bold',
  },
  formCard: {
    padding: 20,
  },
  formFields: {
    gap: 16,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 16,
  },
  qaCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  qaTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  qaText: {
    lineHeight: 14,
  },
  submitButton: {
    marginTop: 8,
  },
  loadingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontWeight: '500',
  },
  simplePayContainer: {
    alignItems: 'center',
    padding: 12,
  },
  simplePayTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  simplePayDesc: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  securityText: {
    fontFamily: 'System',
  },
});
export default MockCheckoutScreen;
