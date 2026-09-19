import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Sparkles, Coins, Check, Heart, Trophy } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { tokenPlans } from '../../config/tokenPlans';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export const PaywallModal: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const user = useSessionStore((state) => state.user);
  const { isPaywallVisible, setPaywallVisible } = useTokenStore();

  const [selectedPkg, setSelectedPkg] = useState<'star' | 'constellation' | 'galaxy'>('constellation');

  const packages = tokenPlans.map((plan) => ({
    ...plan,
    title: plan.name,
    icon: plan.id === 'star' ? <Coins size={20} color={colors.textSecondary} /> :
          plan.id === 'constellation' ? <Sparkles size={20} color={colors.accent} /> :
          <Trophy size={20} color={colors.accent} />
  }));

  const handlePurchase = () => {
    if (!user) return;
    setPaywallVisible(false); // Dismiss the paywall modal
    navigation.navigate('MockCheckout' as any, { planId: selectedPkg });
  };

  const handleClose = () => {
    setPaywallVisible(false);
  };

  return (
    <Modal
      visible={isPaywallVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {/* Close button */}
          <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
            <X size={20} color={colors.textPrimary} />
          </Pressable>

          {/* Pricing Packages view */}
          <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
              <Sparkles size={32} color={colors.accent} style={{ marginBottom: 8 }} />
              <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.sizes.xl, fontFamily: typography.fonts.heading }]}>
                Insufficient Tokens
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.body }]}>
                Unlock precision Vedic readings. Purchases are credited instantly.
              </Text>
            </View>

            <View style={styles.packagesList}>
              {packages.map((pkg) => {
                const isSelected = selectedPkg === pkg.id;
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() => setSelectedPkg(pkg.id as any)}
                    style={[
                      styles.packageCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isSelected ? colors.accent : colors.border,
                        borderWidth: isSelected ? 2 : 1.5,
                        borderRadius: spacing.borderRadius.md,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTitleCol}>
                        <View style={styles.titleWithIcon}>
                          {pkg.icon}
                          <Text style={[styles.pkgTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                            {pkg.title}
                          </Text>
                        </View>
                        <Text style={[styles.pkgDesc, { color: colors.textSecondary, fontSize: 11 }]} numberOfLines={1}>
                          {pkg.desc}
                        </Text>
                      </View>
                      <View style={styles.priceCol}>
                        <Text style={[styles.pkgPrice, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                          {pkg.price}
                        </Text>
                        <Text style={[styles.tokenCount, { color: colors.accent, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bodyBold }]}>
                          {pkg.tokens} Tokens
                        </Text>
                      </View>
                    </View>

                    {pkg.badge && (
                      <View style={[styles.badge, { backgroundColor: isSelected ? colors.accent : colors.surfaceElevated }]}>
                        <Text style={[styles.badgeText, { color: isSelected ? '#000' : colors.accent, fontSize: 8 }]}>
                          {pkg.badge}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.bottomBar}>
              <Button
                title={`Buy ${packages.find(p => p.id === selectedPkg)?.title} now`}
                onPress={handlePurchase}
                style={styles.buyButton}
              />
              <Text style={[styles.termsText, { color: colors.textMuted, fontSize: 9 }]}>
                By continuing, you authorize a secure transaction. Cancel anytime.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    padding: 24,
    height: Platform.OS === 'ios' ? '82%' : '80%',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  packagesList: {
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleCol: {
    flex: 1,
    gap: 4,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pkgTitle: {
    fontWeight: 'bold',
  },
  pkgDesc: {
    letterSpacing: 0.5,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  pkgPrice: {
    fontWeight: 'bold',
  },
  tokenCount: {
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  badgeText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bottomBar: {
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
  },
  buyButton: {
    width: '100%',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  loaderText: {
    fontWeight: '500',
  },
  termsText: {
    textAlign: 'center',
    lineHeight: 14,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  successBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
export default PaywallModal;
