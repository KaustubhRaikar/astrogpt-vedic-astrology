import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useChartStore } from '../../store/useChartStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useNavigation } from '@react-navigation/native';

export const CompatibilityScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<any>();
  const activeChart = useChartStore((state) => state.activeChart);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleMatch = () => {
    setLoading(true);
    setTimeout(() => {
      setResult({
        personA: activeChart?.birthDetails.name || 'Seeker',
        personB: 'Partner',
        totalScore: 28.5,
        maxScore: 36,
        percentage: 79.2,
        verdict: 'Excellent / Highly Compatible',
        kootas: {
          varna: 1,
          vashya: 2,
          tara: 3,
          yoni: 3,
          grahaMaitri: 4.5,
          gana: 6,
          bhakoot: 7,
          nadi: 2,
        },
        aiInterpretation:
          'Person A and Partner share strong spiritual and mental resonance. Moon sign friendship promotes smooth emotional communication, while high Gana & Bhakoot alignment ensures shared life goals and mutual prosperity.',
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Kundali Compatibility
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Intro Banner */}
        <Card variant="glow" style={styles.banner}>
          <Heart size={28} color={colors.accent} style={{ marginBottom: 8 }} />
          <Text style={[styles.bannerTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
            Ashta Koota 36-Guna Matching
          </Text>
          <Text style={[styles.bannerDesc, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
            Evaluates mental, emotional, physical, and financial harmony between two birth charts.
          </Text>
        </Card>

        {/* Profile Comparison Selector */}
        <View style={styles.profileRow}>
          <Card variant="flat" style={styles.profileBox}>
            <Text style={[styles.profileLabel, { color: colors.accent }]}>PERSON A</Text>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{activeChart?.birthDetails.name || 'Your Chart'}</Text>
          </Card>
          <Text style={[styles.vsText, { color: colors.textMuted }]}>&</Text>
          <Card variant="flat" style={styles.profileBox}>
            <Text style={[styles.profileLabel, { color: colors.accent }]}>PERSON B</Text>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>Partner Profile</Text>
          </Card>
        </View>

        {!result ? (
          <Button
            title={loading ? 'Analyzing Alignment...' : 'Calculate Compatibility (5 Tokens)'}
            onPress={handleMatch}
            disabled={loading}
            style={{ marginTop: 24 }}
          />
        ) : (
          <View style={styles.resultContainer}>
            {/* Score Ring / Card */}
            <Card variant="glow" style={styles.scoreCard}>
              <View style={styles.scoreCircle}>
                <Text style={[styles.scoreNumber, { color: colors.accent }]}>{result.totalScore}</Text>
                <Text style={[styles.scoreMax, { color: colors.textMuted }]}>/ 36 Gunas</Text>
              </View>
              <Text style={[styles.verdictText, { color: colors.textPrimary }]}>{result.verdict}</Text>
              <Text style={[styles.pctText, { color: colors.accent }]}>{result.percentage}% Harmony Score</Text>
            </Card>

            {/* AI Relationship Synthesis */}
            <Card variant="elevated" style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Sparkles size={18} color={colors.accent} />
                <Text style={[styles.aiTitle, { color: colors.textPrimary }]}>AI Relationship Guidance</Text>
              </View>
              <Text style={[styles.aiText, { color: colors.textSecondary }]}>{result.aiInterpretation}</Text>
            </Card>

            {/* 8 Koota Breakdown */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>8-Koota Detailed Breakdown</Text>
            {Object.entries(result.kootas).map(([koota, score]: [string, any]) => (
              <View key={koota} style={[styles.kootaRow, { borderColor: colors.border }]}>
                <Text style={[styles.kootaName, { color: colors.textPrimary }]}>{koota.toUpperCase()}</Text>
                <Text style={[styles.kootaScore, { color: colors.accent }]}>{score} pts</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontWeight: 'bold' },
  scrollContainer: { padding: 24, paddingBottom: 48 },
  banner: { padding: 16, alignItems: 'center', textAlign: 'center' },
  bannerTitle: { fontWeight: 'bold', marginTop: 4 },
  bannerDesc: { textAlign: 'center', marginTop: 4, lineHeight: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  profileBox: { flex: 1, padding: 12, alignItems: 'center' },
  profileLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  profileName: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  vsText: { fontSize: 18, fontWeight: 'bold' },
  resultContainer: { marginTop: 24, gap: 16 },
  scoreCard: { padding: 24, alignItems: 'center' },
  scoreCircle: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  scoreNumber: { fontSize: 36, fontWeight: 'bold' },
  scoreMax: { fontSize: 16 },
  verdictText: { fontSize: 16, fontWeight: 'bold' },
  pctText: { fontSize: 12, marginTop: 4 },
  aiCard: { padding: 16 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiTitle: { fontWeight: 'bold', fontSize: 14 },
  aiText: { fontSize: 13, lineHeight: 18 },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  kootaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  kootaName: { fontSize: 13, fontWeight: '600' },
  kootaScore: { fontSize: 13, fontWeight: 'bold' },
});

export default CompatibilityScreen;
