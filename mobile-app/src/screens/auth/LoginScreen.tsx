import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Sparkles } from 'lucide-react-native';
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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const loginStore = useSessionStore((state) => state.login);
  const fetchBalanceAndLedger = useTokenStore((state) => state.fetchBalanceAndLedger);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Simulate Firebase Auth success, then call backend registration/fetch
      const fakeUid = `fb_${Math.random().toString(36).substr(2, 9)}`;
      const { user: loggedInUser, token } = await authApi.register(fakeUid, data.email, null, null);
      
      // Set session & JWT token
      await loginStore(loggedInUser, token);
      // Fetch token balance
      await fetchBalanceAndLedger(loggedInUser.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials or login failed.');
    } finally {
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
              Welcome Back
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.body }]}>
              Enter your credentials to access your charts and guide.
            </Text>
          </View>

          {errorMsg && (
            <Card variant="flat" style={[styles.errorCard, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error, fontSize: typography.sizes.sm }]}>
                {errorMsg}
              </Text>
            </Card>
          )}

          <Card variant="elevated" style={styles.formCard}>
            <View style={styles.formFields}>
              <Controller
                control={control}
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
                control={control}
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
                title="Login"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                style={styles.submitButton}
              />
            </View>
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
              onPress={() => onSubmit({ email: 'google.traveler@gmail.com', password: 'nopassword' })}
              style={styles.socialButton}
            />
            <Button
              title="Apple"
              variant="secondary"
              onPress={() => onSubmit({ email: 'apple.traveler@icloud.com', password: 'nopassword' })}
              style={styles.socialButton}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text style={[styles.footerLink, { color: colors.accent, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodySemibold }]}>
                Sign Up
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
    justifyContent: 'center',
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
export default LoginScreen;
