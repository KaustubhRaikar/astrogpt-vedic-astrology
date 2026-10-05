import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, AlertCircle, Calendar, ArrowRight, ShieldCheck, Orbit, Compass, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useChartStore } from '../../store/useChartStore';
import { kundaliApi } from '../../api/endpoints/kundali';
import { ForecastResponse } from '../../api/types';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TokenBadge from '../../components/TokenBadge';

interface ForecastScreenProps {
  route?: {
    params?: {
      initialPeriod?: 'week' | 'month';
    };
  };
}

export const ForecastScreen: React.FC<ForecastScreenProps> = ({ route }) => {
  const { colors, spacing, typography } = useTheme();
  const { activeChart } = useChartStore();

  const initialPeriod = route?.params?.initialPeriod || 'week';
  const [period, setPeriod] = useState<'week' | 'month'>(initialPeriod);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchForecastData = async (targetPeriod: 'week' | 'month') => {
    if (!activeChart) return;
    setLoading(true);
    try {
      const res = await kundaliApi.getForecast(activeChart.id, targetPeriod);
      setForecast(res);
    } catch (err) {
      console.error('Failed to fetch forecast', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeChart) {
      fetchForecastData(period);
    }
  }, [activeChart?.id, period]);

  const handleRefresh = async () => {
    if (!activeChart) return;
    setRefreshing(true);
    try {
      const res = await kundaliApi.getForecast(activeChart.id, period);
      setForecast(res);
    } catch (err) {
      console.error('Failed to refresh forecast', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
            Planetary Forecast
          </Text>

          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
            {activeChart ? `${activeChart.ascendant} Ascendant • Vimshottari Transit Outlook` : 'Astrological Outlook'}
          </Text>
        </View>
        <TokenBadge />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        {/* Period Selector Segment */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPeriod('week')}
            style={[
              styles.segmentBtn,
              period === 'week' && { backgroundColor: colors.accent, borderRadius: 12 },
            ]}
          >
            <Calendar size={14} color={period === 'week' ? colors.background : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.segmentText,
                { color: period === 'week' ? colors.background : colors.textSecondary },
              ]}
            >
              WEEKLY FORECAST
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPeriod('month')}
            style={[
              styles.segmentBtn,
              period === 'month' && { backgroundColor: colors.accent, borderRadius: 12 },
            ]}
          >
            <Orbit size={14} color={period === 'month' ? colors.background : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.segmentText,
                { color: period === 'month' ? colors.background : colors.textSecondary },
              ]}
            >
              MONTHLY FORECAST
            </Text>
          </TouchableOpacity>
        </View>

        {!activeChart ? (
          <Card variant="glow" style={{ padding: 24, alignItems: 'center', marginTop: 20 }}>
            <Compass size={40} color={colors.accent} style={{ marginBottom: 12 }} />
            <Text style={[styles.noChartTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
              Birth Chart Required
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, textAlign: 'center', marginVertical: 8, lineHeight: 18 }}>
              Please cast or select a birth chart to view personalized planetary transit forecasts.
            </Text>
          </Card>
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 12 }}>
              Synthesizing transit movements across the {period}...
            </Text>
          </View>
        ) : forecast ? (
          <View style={{ gap: 16 }}>
            {/* Overview Card (Lead Paragraph) */}
            <Card variant="glow" style={styles.cardPadding}>
              <View style={styles.cardHeader}>
                <View style={styles.headerTitleRow}>
                  <Sparkles size={18} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.cardTitle, { color: colors.accent, fontSize: typography.sizes.sm, fontFamily: typography.fonts.heading, letterSpacing: 0.8 }]}>
                    {period === 'week' ? 'WEEKLY CELESTIAL OVERVIEW' : 'MONTHLY CELESTIAL OVERVIEW'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                  <RefreshCw size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.overviewText, { color: colors.textPrimary, fontSize: typography.sizes.sm }]}>
                {forecast.overview}
              </Text>
            </Card>

            {/* Highlights List */}
            {forecast.highlights && forecast.highlights.length > 0 && (
              <Card variant="elevated" style={styles.cardPadding}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.heading, marginBottom: 12 }]}>
                  Key Transit Highlights
                </Text>

                {forecast.highlights.map((highlight, idx) => (
                  <View key={idx} style={styles.highlightItem}>
                    <View style={[styles.bulletDot, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.highlightText, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                      {highlight}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Caution Card (Shown ONLY if non-null) */}
            {forecast.caution ? (
              <View style={[styles.cautionBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.error }]}>
                <AlertCircle size={18} color={colors.error} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.error, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bodyBold, marginBottom: 2 }}>
                    Mindful Caution
                  </Text>
                  <Text style={{ color: colors.error, fontSize: 12, lineHeight: 18 }}>
                    {forecast.caution}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.cautionBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.success }]}>
                <ShieldCheck size={16} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.success, fontSize: 11, flex: 1 }}>
                  No high-friction planetary cautions recorded for this {period}.
                </Text>
              </View>
            )}

            {/* Transits Summary (Start & End) */}
            {forecast.transits_at_start && forecast.transits_at_start.length > 0 && (
              <Card variant="flat" style={styles.cardPadding}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.sizes.xs, fontFamily: typography.fonts.heading, marginBottom: 10 }]}>
                  Active Planetary Transit Sign Placement
                </Text>

                <View style={styles.transitPillsRow}>
                  {forecast.transits_at_start.map((t, idx) => (
                    <View key={idx} style={[styles.transitPill, { backgroundColor: 'rgba(212, 175, 55, 0.12)', borderColor: colors.border }]}>
                      <Text style={{ color: colors.accent, fontSize: 10, fontFamily: typography.fonts.bodyBold }}>
                        {t.planet}: <Text style={{ color: colors.textPrimary }}>{t.transit_sign}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </View>
        ) : null}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  noChartTitle: {
    fontWeight: 'bold',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  cardPadding: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  refreshBtn: {
    padding: 4,
  },
  overviewText: {
    lineHeight: 22,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 10,
  },
  highlightText: {
    flex: 1,
    lineHeight: 18,
  },
  cautionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  transitPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  transitPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
});

export default ForecastScreen;
