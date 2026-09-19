import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Calendar, MapPin, MessageSquare, FileText, Plus, UploadCloud, Compass, ArrowRight, AlertCircle, ShieldCheck, Heart } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useChartStore } from '../../store/useChartStore';
import { kundaliApi } from '../../api/endpoints/kundali';
import { DailyInsight } from '../../api/types';
import TokenBadge from '../../components/TokenBadge';
import Card from '../../components/Card';
import Button from '../../components/Button';
import LoadingState from '../../components/LoadingState';
import CompatibilityModal from './components/CompatibilityModal';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export const DashboardScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<any>();
  
  const user = useSessionStore((state) => state.user);
  const { tokens, fetchBalanceAndLedger } = useTokenStore();
  const { activeChart, isGeneratingChart, clearStore } = useChartStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState<boolean>(false);

  useEffect(() => {
    if (user?.id) {
      fetchBalanceAndLedger(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeChart) {
      setDailyLoading(true);
      kundaliApi.getDailyInsight(activeChart.id)
        .then(res => setDailyInsight(res))
        .catch(err => console.error('Failed to fetch daily insight', err))
        .finally(() => setDailyLoading(false));
    }
  }, [activeChart?.id]);

  const handleRefresh = async () => {
    if (user) {
      setRefreshing(true);
      await fetchBalanceAndLedger(user.id);
      if (activeChart) {
        try {
          const insight = await kundaliApi.getDailyInsight(activeChart.id);
          setDailyInsight(insight);
        } catch (e) {
          console.error(e);
        }
      }
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Find active dasha to display
  const activeDasha = activeChart?.dashas.find(d => d.isActive && d.type === 'antardasha');
  const activeMahadasha = activeChart?.dashas.find(d => d.isActive && d.type === 'mahadasha');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bodyMedium }]}>
            {getGreeting().toUpperCase()}
          </Text>
          <Text style={[styles.userName, { color: colors.textPrimary, fontSize: typography.sizes.xl, fontFamily: typography.fonts.heading }]}>
            {user?.displayName || 'Seeker'}
          </Text>
        </View>
        <TokenBadge />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        {activeChart ? (
          // Cast Chart Dashboard View
          <View style={styles.chartViewContainer}>
            {/* Quick Chart Info Card */}
            <Card variant="glow" style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.iconCircle}>
                  <Compass size={24} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                    Birth Chart Casted
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                    {activeChart.ascendant} Ascendant • {activeChart.ascendantDegree.toFixed(1)}°
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Calendar size={14} color={colors.accent} style={styles.detailIcon} />
                  <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                    {activeChart.birthDetails.dateOfBirth} at {activeChart.birthDetails.timeOfBirth}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MapPin size={14} color={colors.accent} style={styles.detailIcon} />
                  <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]} numberOfLines={1}>
                    {activeChart.birthDetails.placeOfBirth}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Current Dasha Card */}
            <Card variant="elevated" style={styles.dashaCard}>
              <View style={styles.dashaHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                  Current Spiritual Season
                </Text>
                <View style={[styles.activeIndicator, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                  <Text style={[styles.activeText, { color: colors.success, fontSize: 10 }]}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.dashaMain}>
                <View style={styles.dashaBox}>
                  <Text style={[styles.dashaLabel, { color: colors.textSecondary, fontSize: 10 }]}>MAHADASHA</Text>
                  <Text style={[styles.dashaName, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
                    {activeMahadasha?.planet || 'Jupiter'}
                  </Text>
                </View>
                <View style={[styles.dashaConnector, { backgroundColor: colors.border }]} />
                <View style={styles.dashaBox}>
                  <Text style={[styles.dashaLabel, { color: colors.textSecondary, fontSize: 10 }]}>ANTARDASHA</Text>
                  <Text style={[styles.dashaName, { color: colors.accent, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
                    {activeDasha?.planet || 'Ketu'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.dashaDescription, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                Your {activeDasha?.planet} sub-period runs from {activeDasha?.startDate} until {activeDasha?.endDate}. This is a period of deep internal reflection.
              </Text>
            </Card>

            {/* Today's Real Daily Insight Card */}
            <Card variant="glow" style={styles.dashaCard}>
              <View style={styles.dashaHeader}>
                <Text style={[styles.sectionTitle, { color: colors.accent, fontSize: typography.sizes.xs, fontFamily: typography.fonts.heading, letterSpacing: 1 }]}>
                  TODAY'S CELESTIAL INSIGHT
                </Text>
                <Sparkles size={16} color={colors.accent} />
              </View>

              {dailyLoading ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
              ) : dailyInsight ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 8 }}>
                      <Text style={{ color: colors.background, fontSize: 10, fontFamily: typography.fonts.bodyBold }}>
                        ENERGY
                      </Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                      {dailyInsight.energy}
                    </Text>
                  </View>

                  <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bodyBold, marginBottom: 4 }}>
                    Focus: <Text style={{ color: colors.textSecondary, fontFamily: typography.fonts.bodyMedium }}>{dailyInsight.focus}</Text>
                  </Text>

                  <Text style={[styles.dashaDescription, { color: colors.textSecondary, fontSize: typography.sizes.xs, textAlign: 'left', lineHeight: 18, marginBottom: 10 }]}>
                    {dailyInsight.guidance}
                  </Text>

                  {/* Graceful Caution Handling */}
                  {dailyInsight.caution ? (
                    <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.error, borderWidth: 1, padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                      <AlertCircle size={16} color={colors.error} style={{ marginRight: 8 }} />
                      <Text style={{ color: colors.error, fontSize: 11, flex: 1, fontFamily: typography.fonts.bodyMedium }}>
                        Caution: {dailyInsight.caution}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.success, borderWidth: 1, padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                      <ShieldCheck size={14} color={colors.success} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.success, fontSize: 11, flex: 1 }}>
                        No celestial cautions today — clear cosmic skies ahead.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                  Harmony & Mindful Progress under your active Vimshottari period.
                </Text>
              )}
            </Card>

            {/* Relationship Compatibility Shortcut Card */}
            <Card variant="flat" style={[styles.dashaCard, { borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)', marginRight: 12 }]}>
                    <Heart size={20} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.heading }}>
                      Kundali Compatibility Match
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      Evaluate Guna Milan & Manglik status between two charts.
                    </Text>
                  </View>
                </View>
                <Button
                  title="Match"
                  onPress={() => setShowCompatibilityModal(true)}
                  style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                />
              </View>
            </Card>

            {/* Navigation Shortcuts */}
            <Text style={[styles.shortcutTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading, marginTop: spacing.xs }]}>
              Cosmic Shortcuts
            </Text>

            <View style={styles.shortcutRow}>
              <Pressable
                onPress={() => navigation.navigate('ChatTab')}
                style={({ pressed }) => [
                  styles.shortcutItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: spacing.borderRadius.lg,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={[styles.shortcutIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                  <MessageSquare size={24} color="#6366F1" />
                </View>
                <Text style={[styles.shortcutName, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }]}>
                  Consult Guide
                </Text>
                <Text style={[styles.shortcutDesc, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                  Ask about career, love, and transits.
                </Text>
                <View style={styles.shortcutArrow}>
                  <ArrowRight size={16} color={colors.textMuted} />
                </View>
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('ReportTab')}
                style={({ pressed }) => [
                  styles.shortcutItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: spacing.borderRadius.lg,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={[styles.shortcutIconBg, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}>
                  <FileText size={24} color={colors.accent} />
                </View>
                <Text style={[styles.shortcutName, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }]}>
                  Full Report
                </Text>
                <Text style={[styles.shortcutDesc, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                  Read your planetary breakdown.
                </Text>
                <View style={styles.shortcutArrow}>
                  <ArrowRight size={16} color={colors.textMuted} />
                </View>
              </Pressable>
            </View>

            <Button
              title="Recast Birth Chart"
              variant="secondary"
              onPress={() => clearStore()}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : (
          // Empty State Dashboard (No Chart)
          <View style={styles.emptyViewContainer}>
            <View style={[styles.circleGlow, { shadowColor: colors.accent }]} />
            <Sparkles size={48} color={colors.accent} style={styles.sparkleIcon} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontSize: typography.sizes.xl, fontFamily: typography.fonts.heading }]}>
              Cast Your Cosmic Map
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontSize: typography.sizes.md, fontFamily: typography.fonts.body }]}>
              To begin counseling with AstroGPT, we need to locate the planetary positions at the exact second you were born.
            </Text>

            <Card variant="elevated" style={styles.actionCard}>
              <View style={styles.actionHeader}>
                <Calendar size={20} color={colors.accent} />
                <Text style={[styles.actionTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                  Path A: Enter Details
                </Text>
              </View>
              <Text style={[styles.actionDesc, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                Provide your exact birth date, time, and city. Resolves coordinates on submit.
              </Text>
              <Button
                title="Enter Birth Details (5 Tokens)"
                onPress={() => navigation.navigate('BirthDataForm')}
                style={styles.actionButton}
              />
            </Card>

            <Card variant="elevated" style={styles.actionCard}>
              <View style={styles.actionHeader}>
                <UploadCloud size={20} color={colors.accent} />
                <Text style={[styles.actionTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                  Path B: Upload Document
                </Text>
              </View>
              <Text style={[styles.actionDesc, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                Upload a picture of a birth certificate or old Kundali paper. We extract the details.
              </Text>
              <Button
                title="Upload Birth Document (10 Tokens)"
                variant="secondary"
                onPress={() => navigation.navigate('DocumentUpload')}
                style={styles.actionButton}
              />
            </Card>
          </View>
        )}
      </ScrollView>

      <CompatibilityModal
        visible={showCompatibilityModal}
        onClose={() => setShowCompatibilityModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  userName: {
    fontWeight: 'bold',
    marginTop: 2,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 96,
  },
  chartViewContainer: {
    gap: 20,
  },
  summaryCard: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  cardSubtitle: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    flex: 1,
  },
  dashaCard: {
    padding: 20,
  },
  dashaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  activeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  activeText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dashaMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  dashaBox: {
    flex: 1,
    alignItems: 'center',
  },
  dashaLabel: {
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dashaName: {
    fontWeight: 'bold',
  },
  dashaConnector: {
    width: 1.5,
    height: 36,
    marginHorizontal: 16,
  },
  dashaDescription: {
    lineHeight: 20,
    textAlign: 'center',
  },
  shortcutTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 16,
  },
  shortcutItem: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    position: 'relative',
    height: 140,
  },
  shortcutIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  shortcutName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shortcutDesc: {
    lineHeight: 16,
  },
  shortcutArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  emptyViewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  circleGlow: {
    position: 'absolute',
    top: 0,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
  },
  sparkleIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
  actionCard: {
    width: '100%',
    padding: 20,
    marginBottom: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  actionTitle: {
    fontWeight: 'bold',
  },
  actionDesc: {
    lineHeight: 18,
    marginBottom: 16,
  },
  actionButton: {
    width: '100%',
  },
});
export default DashboardScreen;
