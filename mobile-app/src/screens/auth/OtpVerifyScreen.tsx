import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { authApi } from '../../api/endpoints/auth';
import Button from '../../components/Button';
import TextInput from '../../components/TextInput';
import Card from '../../components/Card';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';

type OtpRouteProp = RouteProp<AuthStackParamList, 'OtpVerify'>;

export const OtpVerifyScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<OtpRouteProp>();
  const { phone } = route.params;

  const loginStore = useSessionStore((state) => state.login);
  const fetchBalanceAndLedger = useTokenStore((state) => state.fetchBalanceAndLedger);

  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);

  // Countdown timer for code resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (code.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // Simulate verification API success
      const fakeUid = `fb_phone_${Math.random().toString(36).substr(2, 9)}`;
      const { user: registeredUser, token } = await authApi.register(fakeUid, null, phone, 'Seeker');
      
      // Set session & JWT token
      await loginStore(registeredUser, token);
      // Fetch token balance
      await fetchBalanceAndLedger(registeredUser.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimer(60);
    setErrorMsg(null);
    setCode('');
    // Mock resending OTP trigger here
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.sizes.xxl, fontFamily: typography.fonts.heading }]}>
            Verify Your Number
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.body }]}>
            We sent a 6-digit verification code to {phone}.
          </Text>

          {errorMsg && (
            <Card variant="flat" style={[styles.errorCard, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error, fontSize: typography.sizes.sm }]}>
                {errorMsg}
              </Text>
            </Card>
          )}

          <Card variant="elevated" style={styles.formCard}>
            <TextInput
              label="Verification Code"
              placeholder="123456"
              maxLength={6}
              keyboardType="number-pad"
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/[^0-9]/g, ''));
                if (errorMsg) setErrorMsg(null);
              }}
              style={styles.codeInput}
            />

            <Button
              title="Verify Code"
              onPress={handleVerify}
              loading={loading}
              style={styles.submitButton}
            />

            <View style={styles.resendRow}>
              {timer > 0 ? (
                <Text style={[styles.timerText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  Resend code in {timer}s
                </Text>
              ) : (
                <Pressable onPress={handleResend}>
                  <Text style={[styles.resendLink, { color: colors.accent, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodySemibold }]}>
                    Resend Code
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>

          <Button
            title="Back to Sign Up"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
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
    marginBottom: 16,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 16,
  },
  resendRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  timerText: {
    fontFamily: 'System',
  },
  resendLink: {
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 8,
  },
});
export default OtpVerifyScreen;
