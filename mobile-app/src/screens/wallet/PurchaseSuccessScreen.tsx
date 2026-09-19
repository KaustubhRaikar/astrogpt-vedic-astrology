import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, withRepeat } from 'react-native-reanimated';
import { Coins, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useTokenStore } from '../../store/useTokenStore';
import { useSessionStore } from '../../store/useSessionStore';
import { getPlanById } from '../../config/tokenPlans';
import Button from '../../components/Button';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

const { width, height } = Dimensions.get('window');

type SuccessRouteProp = RouteProp<RootStackParamList, 'PurchaseSuccess'>;

// Confetti Particle Component
const ConfettiParticle = ({ index }: { index: number }) => {
  const fallY = useSharedValue(-50);
  const driftX = useSharedValue(Math.random() * width);
  const rotate = useSharedValue(0);

  const colors = ['#D4AF37', '#6366F1', '#4F46E5', '#FDA4AF', '#10B981', '#3B82F6'];
  const particleColor = colors[index % colors.length];
  const size = Math.random() * 8 + 6;

  useEffect(() => {
    fallY.value = withDelay(
      Math.random() * 800,
      withTiming(height + 100, { duration: Math.random() * 2000 + 2000 })
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: Math.random() * 1000 + 1000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      backgroundColor: particleColor,
      width: size,
      height: size,
      borderRadius: index % 2 === 0 ? 0 : size / 2, // Mix squares and circles
      transform: [
        { translateY: fallY.value },
        { translateX: driftX.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: 0.8,
    };
  });

  return <Animated.View style={animatedStyle} />;
};

export const PurchaseSuccessScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SuccessRouteProp>();

  const user = useSessionStore((state) => state.user);
  const currentTokens = useTokenStore((state) => state.tokens);
  const buyTokens = useTokenStore((state) => state.buyTokens);

  const planId = (route.params as any)?.planId || 'constellation';
  const plan = getPlanById(planId);

  // Trigger the tokens API transaction sync on mount
  useEffect(() => {
    if (user) {
      // Calls buyTokens which posts to /tokens/purchase
      // In production, this completes only after verified payments.
      buyTokens(user.id, planId).catch((err) => {
        console.error('Failed to sync payment purchase endpoint', err);
      });
    }
  }, [user, planId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Test mode banner */}
      <View style={styles.testBanner}>
        <AlertCircle size={14} color="#FFF" style={{ marginRight: 6 }} />
        <Text style={styles.testBannerText}>TEST MODE — NO REAL CHARGES WILL OCCUR</Text>
      </View>

      {/* Confetti Spawner */}
      {Array.from({ length: 40 }).map((_, i) => (
        <ConfettiParticle key={i} index={i} />
      ))}

      <View style={styles.content}>
        <View style={[styles.successCircle, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
          <CheckCircle size={60} color={colors.success} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.sizes.xxl, fontFamily: typography.fonts.heading }]}>
          Purchase Complete!
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.md, fontFamily: typography.fonts.body }]}>
          Your credits have been synchronized. The cosmic guide is waiting.
        </Text>

        {/* Credit Breakdown Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              Tokens Credited
            </Text>
            <View style={styles.tokenGlow}>
              <Coins size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.receiptValue, { color: colors.accent, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodyBold }]}>
                +{plan?.tokens || 50}
              </Text>
            </View>
          </View>
          
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              Current Wallet Balance
            </Text>
            <View style={styles.tokenGlow}>
              <Coins size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.receiptValue, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodyBold }]}>
                {currentTokens}
              </Text>
            </View>
          </View>
        </View>

        <Button
          title="Return to Wallet"
          onPress={() => {
            navigation.popToTop(); // Back to MainTabs
            navigation.navigate('Main'); // Ensure we are on MainTabs
          }}
          icon={<ArrowRight size={18} color={colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C'} />}
          style={styles.doneButton}
        />
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
  successCircle: {
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
    marginBottom: 32,
  },
  receiptCard: {
    width: '100%',
    padding: 20,
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 36,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontWeight: '500',
  },
  receiptValue: {
    fontWeight: 'bold',
  },
  tokenGlow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDivider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  doneButton: {
    width: '100%',
  },
});
export default PurchaseSuccessScreen;
