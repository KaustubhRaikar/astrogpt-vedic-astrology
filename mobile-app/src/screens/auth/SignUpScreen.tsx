import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Phone as PhoneIcon, Lock, User as UserIcon, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { authApi } from '../../api/endpoints/auth';
import Button from '../../components/Button';
import TextInput from '../../components/TextInput';
import Card from '../../components/Card';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';

// Zod schemas
const emailSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const phoneSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter a valid 10+ digit phone number'),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;

export const SignUpScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const loginStore = useSessionStore((state) => state.login);
  const fetchBalanceAndLedger = useTokenStore((state) => state.fetchBalanceAndLedger);

  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email form
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  // Phone form
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { name: '', phone: '' },
  });

  const onEmailSubmit = async (data: EmailFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Simulate Firebase Auth success, then call backend registration
      const fakeUid = `fb_${Math.random().toString(36).substr(2, 9)}`;
      const { user: registeredUser, token } = await authApi.register(fakeUid, data.email, null, data.name);
      
      // Set session & JWT token
      await loginStore(registeredUser, token);
      // Fetch token balance
      await fetchBalanceAndLedger(registeredUser.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Navigate to OTP Verification screen with the phone number
      setLoading(false);
      navigation.navigate('OtpVerify', { phone: data.phone });
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP generation failed.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logoIcon, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent }]}>
              <Sparkles size={28} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.sizes.xxl, fontFamily: typography.fonts.heading }]}>
              Begin Your Journey
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.body }]}>
              Cast your Vedic chart and unlock AI astrological advice.
            </Text>
          </View>

          {errorMsg && (
            <Card variant="flat" style={[styles.errorCard, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error, fontSize: typography.sizes.sm }]}>
                {errorMsg}
              </Text>
            </Card>
          )}

          {/* Segmented Control */}
          <View style={[styles.segmentedContainer, { backgroundColor: colors.surfaceElevated, borderRadius: spacing.borderRadius.md, padding: spacing.xxs }]}>
            <Pressable
              style={[styles.segmentButton, authMode === 'email' && { backgroundColor: colors.surface, borderRadius: spacing.borderRadius.sm }]}
              onPress={() => {
                setAuthMode('email');
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.segmentText, { color: authMode === 'email' ? colors.accent : colors.textSecondary, fontSize: typography.sizes.sm }]}>
                Email
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, authMode === 'phone' && { backgroundColor: colors.surface, borderRadius: spacing.borderRadius.sm }]}
              onPress={() => {
                setAuthMode('phone');
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.segmentText, { color: authMode === 'phone' ? colors.accent : colors.textSecondary, fontSize: typography.sizes.sm }]}>
                Phone OTP
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          <Card variant="elevated" style={styles.formCard}>
            {authMode === 'email' ? (
              <View style={styles.formFields}>
                <Controller
                  control={emailForm.control}
                  name="name"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Full Name"
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
                  control={emailForm.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Email Address"
                      placeholder="jane.doe@example.com"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={error?.message}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  )}
                />

                <Controller
                  control={emailForm.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Password"
                      placeholder="••••••••"
                      secureTextEntry
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={error?.message}
                      autoCapitalize="none"
                    />
                  )}
                />

                <Button
                  title="Create Account"
                  onPress={emailForm.handleSubmit(onEmailSubmit)}
                  loading={loading}
                  style={styles.submitButton}
                />
              </View>
            ) : (
              <View style={styles.formFields}>
                <Controller
                  control={phoneForm.control}
                  name="name"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Full Name"
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
                  control={phoneForm.control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Phone Number"
                      placeholder="+15550199"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={error?.message}
                      keyboardType="phone-pad"
                    />
                  )}
                />

                <Button
                  title="Send Verification Code"
                  onPress={phoneForm.handleSubmit(onPhoneSubmit)}
                  loading={loading}
                  style={styles.submitButton}
                />
              </View>
            )}
          </Card>

          {/* Social Logins */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
              OR CONTINUE WITH
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialButtonsRow}>
            <Button
              title="Google"
              variant="secondary"
              onPress={() => onEmailSubmit({ name: 'Google Traveler', email: 'google.traveler@gmail.com', password: 'nopassword' })}
              style={styles.socialButton}
            />
            <Button
              title="Apple"
              variant="secondary"
              onPress={() => onEmailSubmit({ name: 'Apple Traveler', email: 'apple.traveler@icloud.com', password: 'nopassword' })}
              style={styles.socialButton}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerLink, { color: colors.accent, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodySemibold }]}>
                Login
              </Text>
            </Pressable>
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
  scrollContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  errorCard: {
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  segmentedContainer: {
    flexDirection: 'row',
    height: 40,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: '600',
  },
  formCard: {
    padding: 20,
    marginBottom: 24,
  },
  formFields: {
    gap: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  socialButton: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'System',
  },
  footerLink: {
    fontWeight: 'bold',
  },
});
export default SignUpScreen;
