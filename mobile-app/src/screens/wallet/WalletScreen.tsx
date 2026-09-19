import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, ArrowUpRight, ArrowDownLeft, PlusCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';

export const WalletScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  
  const user = useSessionStore((state) => state.user);
  const { tokens, ledger, isLoading, fetchBalanceAndLedger, setPaywallVisible } = useTokenStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBalanceAndLedger(user.id);
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    if (user) {
      setRefreshing(true);
      await fetchBalanceAndLedger(user.id);
      setRefreshing(false);
    }
  };

  const formatActionDescription = (action: string) => {
    if (!action) return 'Token Transaction';
    if (action === 'analysis') return 'Vedic Kundali Chart Generation';
    if (action === 'upload') return 'Chart Document OCR Extraction';
    if (action === 'chat') return 'Spiritual AI Consultation';
    if (action.startsWith('purchase:')) {
      const planId = action.split(':')[1];
      const planName = planId === 'star' ? 'Star Package' : planId === 'constellation' ? 'Constellation Package' : planId === 'galaxy' ? 'Galaxy Package' : planId;
      return `Purchased ${planName}`;
    }
    return action;
  };

  const renderTransactionItem = ({ item }: { item: any }) => {
    const isAdd = item.amount > 0;
    return (
      <Card variant="flat" style={[styles.txItem, { borderColor: colors.border }]}>
        <View style={styles.txLeft}>
          <View style={[styles.iconCircle, { backgroundColor: isAdd ? colors.successBg : colors.surfaceElevated }]}>
            {isAdd ? (
              <ArrowUpRight size={18} color={colors.success} />
            ) : (
              <ArrowDownLeft size={18} color={colors.accent} />
            )}
          </View>
          <View style={styles.txMeta}>
            <Text style={[styles.txDesc, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }]} numberOfLines={1}>
              {formatActionDescription(item.description)}
            </Text>
            <Text style={[styles.txDate, { color: colors.textMuted, fontSize: 10 }]}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.txAmount,
            {
              color: isAdd ? colors.success : colors.accent,
              fontSize: typography.sizes.md,
              fontFamily: typography.fonts.heading,
            },
          ]}
        >
          {isAdd ? `+${item.amount}` : item.amount}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Token Wallet
        </Text>
      </View>

      <FlatList
        data={ledger}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={() => (
          <View style={styles.walletHeader}>
            <View style={[styles.balanceOuterCircle, { borderColor: colors.border }]}>
              <View style={[styles.balanceCircle, { backgroundColor: colors.surface, borderColor: colors.accent, shadowColor: colors.accent }]}>
                <Coins size={36} color={colors.accent} style={{ marginBottom: 6 }} />
                <Text style={[styles.balanceNum, { color: colors.textPrimary, fontSize: typography.sizes.xxxl, fontFamily: typography.fonts.heading }]}>
                  {tokens}
                </Text>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary, fontSize: 10 }]}>AVAILABLE TOKENS</Text>
              </View>
            </View>

            <Button
              title="Add Tokens"
              onPress={() => setPaywallVisible(true)}
              icon={<PlusCircle size={18} color={colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C'} />}
              style={styles.addTokensButton}
            />

            <Text style={[styles.historyTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
              Transaction Ledger
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ paddingVertical: 40 }}>
            <EmptyState
              title="No Ledger History"
              description="Your token spends and credit purchases will show up in this transaction log."
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 24,
    paddingBottom: 96,
  },
  walletHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceOuterCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceNum: {
    fontWeight: 'bold',
  },
  balanceLabel: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  addTokensButton: {
    width: '100%',
    marginBottom: 28,
  },
  historyTitle: {
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txMeta: {
    flex: 1,
  },
  txDesc: {
    fontWeight: 'bold',
  },
  txDate: {
    fontFamily: 'System',
    marginTop: 2,
  },
  txAmount: {
    fontWeight: 'bold',
  },
});
export default WalletScreen;
