import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Heart, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useSessionStore } from '../../../store/useSessionStore';
import { useChartStore } from '../../../store/useChartStore';
import { kundaliApi } from '../../../api/endpoints/kundali';
import { CompatibilityResponse, KundaliChart } from '../../../api/types';
import Card from '../../../components/Card';
import Button from '../../../components/Button';

interface CompatibilityModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ visible, onClose }) => {
  const { colors, spacing, typography } = useTheme();
  const user = useSessionStore((state) => state.user);
  const activeChart = useChartStore((state) => state.activeChart);

  const [chartsList, setChartsList] = useState<Array<{ chart_id: string; name: string; generated_at: string }>>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [selectedChartA, setSelectedChartA] = useState<string | null>(null);
  const [selectedChartB, setSelectedChartB] = useState<string | null>(null);

  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<CompatibilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user) {
      setLoadingCharts(true);
      kundaliApi.listCharts(user.id)
        .then((list: Array<{ chart_id: string; name: string; generated_at: string }>) => {
          setChartsList(list);
          if (activeChart) {
            setSelectedChartA(activeChart.id);
            // Default select second chart if available
            const second = list.find((c: { chart_id: string; name: string; generated_at: string }) => c.chart_id !== activeChart.id);
            if (second) setSelectedChartB(second.chart_id);
          } else if (list.length >= 2) {
            setSelectedChartA(list[0].chart_id);
            setSelectedChartB(list[1].chart_id);
          }
        })
        .catch((err: any) => console.error('Failed to load chart list', err))
        .finally(() => setLoadingCharts(false));
    }
  }, [visible, user?.id, activeChart?.id]);

  const handleRunCompatibility = async () => {
    if (!selectedChartA || !selectedChartB) {
      setError('Please select two charts to evaluate compatibility.');
      return;
    }
    if (selectedChartA === selectedChartB) {
      setError('Please select two different charts for compatibility comparison.');
      return;
    }

    setError(null);
    setComputing(true);
    try {
      const res = await kundaliApi.checkCompatibility(selectedChartA, selectedChartB);
      setResult(res);
    } catch (err: any) {
      console.error('Compatibility calculation failed', err);
      setError('Failed to compute compatibility. Please try again.');
    } finally {
      setComputing(false);
    }
  };

  const getChartName = (chartId: string) => {
    if (activeChart && activeChart.id === chartId) return `${activeChart.birthDetails.name} (Active)`;
    const found = chartsList.find(c => c.chart_id === chartId);
    return found?.name || `Chart (${chartId.slice(0, 6)})`;
  };

  const resetModal = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={resetModal}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        {/* Modal Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Heart size={22} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
              Kundali Compatibility Match
            </Text>
          </View>
          <Pressable onPress={resetModal} style={styles.closeBtn}>
            <X size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {!result ? (
            /* Setup / Picker View */
            <View style={styles.setupContainer}>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                Select two natal charts to compare Manglik Dosha status and evaluate partial Ashta Koota (Guna Milan) scores.
              </Text>

              {error && (
                <View style={[styles.errorBox, { borderColor: colors.error }]}>
                  <Text style={{ color: colors.error, fontSize: typography.sizes.xs }}>{error}</Text>
                </View>
              )}

              {/* Chart A Selector */}
              <Card variant="flat" style={styles.pickerCard}>
                <Text style={[styles.pickerLabel, { color: colors.accent, fontSize: typography.sizes.xs }]}>
                  PARTNER 1 (CHART A)
                </Text>
                {loadingCharts ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <View style={styles.chartOptionsList}>
                    {chartsList.map((c) => (
                      <Pressable
                        key={c.chart_id}
                        onPress={() => setSelectedChartA(c.chart_id)}
                        style={[
                          styles.optionItem,
                          {
                            borderColor: selectedChartA === c.chart_id ? colors.accent : colors.border,
                            backgroundColor: selectedChartA === c.chart_id ? colors.surfaceElevated : colors.surface,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: selectedChartA === c.chart_id ? 'bold' : 'normal', fontSize: typography.sizes.sm }}>
                          {c.name || 'Natal Chart'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Card>

              {/* Chart B Selector */}
              <Card variant="flat" style={styles.pickerCard}>
                <Text style={[styles.pickerLabel, { color: colors.accent, fontSize: typography.sizes.xs }]}>
                  PARTNER 2 (CHART B)
                </Text>
                {loadingCharts ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <View style={styles.chartOptionsList}>
                    {chartsList.map((c) => (
                      <Pressable
                        key={c.chart_id}
                        onPress={() => setSelectedChartB(c.chart_id)}
                        style={[
                          styles.optionItem,
                          {
                            borderColor: selectedChartB === c.chart_id ? colors.accent : colors.border,
                            backgroundColor: selectedChartB === c.chart_id ? colors.surfaceElevated : colors.surface,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: selectedChartB === c.chart_id ? 'bold' : 'normal', fontSize: typography.sizes.sm }}>
                          {c.name || 'Natal Chart'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Card>

              <Button
                title={computing ? "Calculating Synastry..." : "Evaluate Relationship Match"}
                onPress={handleRunCompatibility}
                disabled={computing || !selectedChartA || !selectedChartB}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            /* Results View */
            <View style={styles.resultsContainer}>
              <Pressable onPress={() => setResult(null)} style={styles.reselectBtn}>
                <Text style={{ color: colors.accent, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bodyBold }}>
                  ← Select Different Charts
                </Text>
              </Pressable>

              {/* CRITICAL UX REQUIREMENT: Prominent Partial Score Alert Banner */}
              <Card variant="glow" style={styles.partialScoreBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <AlertTriangle size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#F59E0B', fontSize: typography.sizes.sm, fontFamily: typography.fonts.heading, letterSpacing: 0.5 }}>
                    PARTIAL COMPATIBILITY CHECK ({result.ashta_koota.partial_total}/{result.ashta_koota.partial_out_of} SCORED)
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, lineHeight: 18 }}>
                  Notice: 4 of the 8 traditional scoring categories (Vashya, Yoni, Graha Maitri, Bhakoot) are currently under development. This score represents an incomplete subset — <Text style={{ color: colors.textPrimary, fontFamily: typography.fonts.bodyBold }}>full 36-point Guna Milan analysis coming soon</Text>. Do not use this partial score as a final result for marriage decisions.
                </Text>
              </Card>

              {/* Manglik Comparison */}
              <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                Manglik Dosha Analysis
              </Text>

              <View style={styles.manglikRow}>
                {/* Partner A */}
                <Card variant="flat" style={styles.manglikCard}>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: typography.fonts.bodyBold }}>
                    {selectedChartA ? getChartName(selectedChartA) : 'Partner 1'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: result.manglik_a.is_manglik ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={{ color: result.manglik_a.is_manglik ? colors.error : colors.success, fontSize: 11, fontFamily: typography.fonts.bodyBold }}>
                      {result.manglik_a.is_manglik ? 'MANGLIK' : 'NON-MANGLIK'}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                    Mars House: {result.manglik_a.mars_house}
                  </Text>
                </Card>

                {/* Partner B */}
                <Card variant="flat" style={styles.manglikCard}>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: typography.fonts.bodyBold }}>
                    {selectedChartB ? getChartName(selectedChartB) : 'Partner 2'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: result.manglik_b.is_manglik ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={{ color: result.manglik_b.is_manglik ? colors.error : colors.success, fontSize: 11, fontFamily: typography.fonts.bodyBold }}>
                      {result.manglik_b.is_manglik ? 'MANGLIK' : 'NON-MANGLIK'}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                    Mars House: {result.manglik_b.mars_house}
                  </Text>
                </Card>
              </View>

              {/* Ashta Koota Category Scores */}
              <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading, marginTop: 16 }]}>
                Ashta Koota Breakdown (8 Classical Categories)
              </Text>

              <Card variant="flat" style={styles.scoresTable}>
                {Object.entries({
                  'Varna (Spiritual Work)': { score: result.ashta_koota.scores.varna, max: 1 },
                  'Vashya (Mutual Attraction)': { score: result.ashta_koota.scores.vashya, max: 2 },
                  'Tara (Destiny & Health)': { score: result.ashta_koota.scores.tara, max: 3 },
                  'Yoni (Intimacy & Temperament)': { score: result.ashta_koota.scores.yoni, max: 4 },
                  'Graha Maitri (Psychological)': { score: result.ashta_koota.scores.graha_maitri, max: 5 },
                  'Gana (Temperament Match)': { score: result.ashta_koota.scores.gana, max: 6 },
                  'Bhakoot (Emotional Welfare)': { score: result.ashta_koota.scores.bhakoot, max: 7 },
                  'Nadi (Genetic/Health Harmony)': { score: result.ashta_koota.scores.nadi, max: 8 },
                }).map(([koota, data], idx) => (
                  <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xs, flex: 1 }}>
                      {koota}
                    </Text>
                    {data.score !== null ? (
                      <Text style={{ color: colors.accent, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bodyBold }}>
                        {data.score} / {data.max} pts
                      </Text>
                    ) : (
                      <View style={[styles.pendingTag, { backgroundColor: colors.surfaceElevated }]}>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>Pending</Text>
                      </View>
                    )}
                  </View>
                ))}
              </Card>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  setupContainer: {
    gap: 16,
  },
  subtitle: {
    lineHeight: 20,
  },
  errorBox: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  pickerCard: {
    padding: 16,
  },
  pickerLabel: {
    fontFamily: 'System',
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  chartOptionsList: {
    gap: 8,
  },
  optionItem: {
    borderWidth: 1.5,
    padding: 12,
    borderRadius: 8,
  },
  resultsContainer: {
    gap: 12,
  },
  reselectBtn: {
    marginBottom: 8,
  },
  partialScoreBanner: {
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  sectionHeading: {
    marginTop: 8,
    marginBottom: 4,
  },
  manglikRow: {
    flexDirection: 'row',
    gap: 12,
  },
  manglikCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  scoresTable: {
    padding: 16,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pendingTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
export default CompatibilityModal;
