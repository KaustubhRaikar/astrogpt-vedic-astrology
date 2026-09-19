import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Compass, Info, Share2 } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import { useTheme } from '../../theme/ThemeProvider';
import { useChartStore } from '../../store/useChartStore';
import { kundaliApi } from '../../api/endpoints/kundali';
import { DivisionalChart } from '../../api/types';
import ChartSvgRender from './components/ChartSvgRender';
import PlanetCards from './components/PlanetCards';
import DashaTimeline from './components/DashaTimeline';
import ExportActionSheetModal from './components/ExportActionSheetModal';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { useNavigation } from '@react-navigation/native';
import {
  captureChartImage,
  shareChartImage,
  saveChartToGallery,
  exportAndSharePdf,
  getChartFilename,
} from '../../utils/chartExporter';

export const ChartScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<any>();
  const activeChart = useChartStore((state) => state.activeChart);
  const [selectedChartType, setSelectedChartType] = React.useState<'D1' | 'D9' | 'D10'>('D1');
  const [divisionalData, setDivisionalData] = React.useState<DivisionalChart | null>(null);
  const [divisionalLoading, setDivisionalLoading] = React.useState<boolean>(false);
  const [divisionalError, setDivisionalError] = React.useState<string | null>(null);

  // ViewShot capture ref & export modal states
  const viewShotRef = React.useRef<any>(null);
  const [exportModalVisible, setExportModalVisible] = React.useState<boolean>(false);
  const [exportLoading, setExportLoading] = React.useState<boolean>(false);
  const [exportLoadingText, setExportLoadingText] = React.useState<string>('');
  const [exportStatus, setExportStatus] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDivisional = React.useCallback(async (division: 'D9' | 'D10') => {
    if (!activeChart) return;
    setDivisionalLoading(true);
    setDivisionalError(null);
    try {
      const res = await kundaliApi.getDivisionalChart(activeChart.id, division);
      setDivisionalData(res);
    } catch (err: any) {
      console.error(`Failed to fetch ${division} divisional chart`, err);
      setDivisionalError(`Failed to calculate ${division} divisional chart.`);
    } finally {
      setDivisionalLoading(false);
    }
  }, [activeChart?.id]);

  React.useEffect(() => {
    if (selectedChartType === 'D9' || selectedChartType === 'D10') {
      fetchDivisional(selectedChartType);
    } else {
      setDivisionalData(null);
      setDivisionalError(null);
    }
  }, [selectedChartType, fetchDivisional]);

  const handleShareImage = async () => {
    if (!activeChart) return;
    setExportLoading(true);
    setExportLoadingText('Capturing chart image...');
    setExportStatus(null);
    try {
      const uri = await captureChartImage(viewShotRef);
      const filename = getChartFilename(
        activeChart.birthDetails.name,
        selectedChartType,
        'png'
      );
      await shareChartImage(uri, filename);
      setExportStatus({ type: 'success', text: `Shared ${filename}` });
    } catch (err: any) {
      console.error('Share image failed:', err);
      setExportStatus({ type: 'error', text: err.message || 'Failed to capture and share image.' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleSaveGallery = async () => {
    if (!activeChart) return;
    setExportLoading(true);
    setExportLoadingText('Saving chart to photo gallery...');
    setExportStatus(null);
    try {
      const uri = await captureChartImage(viewShotRef);
      const res = await saveChartToGallery(uri);
      if (res.success) {
        setExportStatus({ type: 'success', text: res.message || 'Saved chart to photo gallery!' });
      } else {
        setExportStatus({ type: 'error', text: res.message || 'Failed to save image.' });
      }
    } catch (err: any) {
      console.error('Save to gallery failed:', err);
      setExportStatus({ type: 'error', text: err.message || 'Failed to save chart image.' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleSharePdf = async () => {
    if (!activeChart) return;
    setExportLoading(true);
    setExportLoadingText('Generating 1-page PDF report...');
    setExportStatus(null);
    try {
      const uri = await captureChartImage(viewShotRef);
      const filename = getChartFilename(
        activeChart.birthDetails.name,
        selectedChartType,
        'pdf'
      );
      const ascendantText =
        selectedChartType === 'D1'
          ? activeChart.ascendant
          : divisionalData?.ascendant_sign
          ? `${divisionalData.ascendant_sign}`
          : activeChart.ascendant;

      await exportAndSharePdf(
        uri,
        {
          name: activeChart.birthDetails.name,
          dateOfBirth: activeChart.birthDetails.dateOfBirth,
          timeOfBirth: activeChart.birthDetails.timeOfBirth,
          placeOfBirth: activeChart.birthDetails.placeOfBirth,
          ascendant: ascendantText,
          division: selectedChartType,
        },
        filename
      );
      setExportStatus({ type: 'success', text: `Shared ${filename}` });
    } catch (err: any) {
      console.error('Share PDF failed:', err);
      setExportStatus({ type: 'error', text: err.message || 'Failed to generate PDF.' });
    } finally {
      setExportLoading(false);
    }
  };

  if (!activeChart) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          title="No Active Chart Casted"
          description="Cast your birth chart on the Dashboard to see planetary coordinate renders."
          actionTitle="Go to Dashboard"
          onActionPress={() => navigation.navigate('DashboardTab' as any)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Your Vedic Kundali
        </Text>
        <Pressable
          onPress={() => {
            setExportStatus(null);
            setExportModalVisible(true);
          }}
          style={styles.exportHeaderButton}
          accessibilityLabel="Export Kundali Chart"
        >
          <Share2 size={20} color={colors.accent} />
        </Pressable>
      </View>

      {/* Divisional Chart Segmented Tab Selector */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={[styles.tabButton, selectedChartType === 'D1' && { backgroundColor: colors.accent }]}
          onPress={() => setSelectedChartType('D1')}
        >
          <Text style={[styles.tabText, { color: selectedChartType === 'D1' ? colors.background : colors.textSecondary }]}>
            D1 Rashi
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, selectedChartType === 'D9' && { backgroundColor: colors.accent }]}
          onPress={() => setSelectedChartType('D9')}
        >
          <Text style={[styles.tabText, { color: selectedChartType === 'D9' ? colors.background : colors.textSecondary }]}>
            D9 Navamsha
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, selectedChartType === 'D10' && { backgroundColor: colors.accent }]}
          onPress={() => setSelectedChartType('D10')}
        >
          <Text style={[styles.tabText, { color: selectedChartType === 'D10' ? colors.background : colors.textSecondary }]}>
            D10 Dashamsha
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {selectedChartType === 'D1' ? (
          <>
            {/* SVG Render Container wrapped in ViewShot */}
            <View style={styles.chartContainer}>
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                <ChartSvgRender svgString={activeChart.svgString} />
              </ViewShot>
            </View>

            {/* Informative Vedic Box */}
            <Card variant="flat" style={[styles.infoBox, { marginHorizontal: 24, marginTop: spacing.md }]}>
              <Info size={16} color={colors.accent} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                D1 Rashi Chart: Represents physical life, bodily identity, and overall baseline natal energy.
              </Text>
            </Card>

            {/* Planet cards */}
            <PlanetCards planets={activeChart.planets} />

            {/* Dasha timeline */}
            <DashaTimeline dashas={activeChart.dashas} />
          </>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
            {divisionalLoading ? (
              <Card variant="flat" style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: 12 }} />
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                  Calculating {selectedChartType === 'D9' ? 'Navamsha (D9)' : 'Dashamsha (D10)'} planetary harmonics...
                </Text>
              </Card>
            ) : divisionalError ? (
              <Card variant="flat" style={{ padding: 20, alignItems: 'center', borderColor: colors.error, borderWidth: 1 }}>
                <Text style={{ color: colors.error, fontSize: typography.sizes.sm, marginBottom: 12, textAlign: 'center' }}>
                  {divisionalError}
                </Text>
                <Pressable
                  onPress={() => fetchDivisional(selectedChartType)}
                  style={{ backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                >
                  <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: typography.sizes.xs }}>
                    Retry Calculation
                  </Text>
                </Pressable>
              </Card>
            ) : divisionalData ? (
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                {/* Ascendant Banner */}
                <Card variant="glow" style={{ padding: 16, marginBottom: 16, alignItems: 'center' }}>
                  <Compass size={24} color={colors.accent} style={{ marginBottom: 6 }} />
                  <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }}>
                    {divisionalData.division === 'D9' ? 'D9 Navamsha Chart' : 'D10 Dashamsha Chart'}
                  </Text>
                  <Text style={{ color: colors.accent, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold, marginTop: 4 }}>
                    {divisionalData.ascendant_sign} Ascendant (Lagna)
                  </Text>
                </Card>

                {/* Informative Box */}
                <Card variant="flat" style={[styles.infoBox, { marginBottom: 16 }]}>
                  <Info size={16} color={colors.accent} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                    {divisionalData.division === 'D9'
                      ? 'D9 Navamsha: Analyzes soul alignment, marriage compatibility, and inner spiritual strength.'
                      : 'D10 Dashamsha: Analyzes professional status, leadership potential, and career milestones.'}
                  </Text>
                </Card>

                {/* Divisional Planet Positions */}
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading, marginBottom: 12 }}>
                  Divisional Planet Placements
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {divisionalData.planets.map((p, idx) => (
                    <Card key={idx} variant="flat" style={{ width: '48%', padding: 12, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ color: colors.accent, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }}>
                        {p.planet}
                      </Text>
                      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xs, marginTop: 4 }}>
                        Sign: <Text style={{ fontFamily: typography.fonts.bodyBold }}>{p.sign}</Text>
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                        House {p.house}
                      </Text>
                    </Card>
                  ))}
                </View>
              </ViewShot>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Export Options Modal Sheet */}
      <ExportActionSheetModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onShareImage={handleShareImage}
        onSaveGallery={handleSaveGallery}
        onSharePdf={handleSharePdf}
        divisionLabel={
          selectedChartType === 'D1'
            ? 'D1 Rashi'
            : selectedChartType === 'D9'
            ? 'D9 Navamsha'
            : 'D10 Dashamsha'
        }
        isLoading={exportLoading}
        loadingText={exportLoadingText}
        statusMessage={exportStatus}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  exportHeaderButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingBottom: 48,
  },
  chartContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  infoText: {
    flex: 1,
    lineHeight: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 4,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ChartScreen;

