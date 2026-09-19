import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, FileText, ChevronDown, ChevronUp, Lock, Briefcase, Heart, ShieldAlert, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useChartStore } from '../../store/useChartStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import TokenBadge from '../../components/TokenBadge';
import LoadingState from '../../components/LoadingState';

export const ReportScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  
  const user = useSessionStore((state) => state.user);
  const tokenStore = useTokenStore();
  const { activeChart, activeReport, generateReport, loadCachedReport, isGeneratingReport } = useChartStore();

  useEffect(() => {
    if (activeChart && !activeReport && user) {
      loadCachedReport(user.id, activeChart.id).catch(e => {
        console.warn('Failed to load cached report on mount', e);
      });
    }
  }, [activeChart, activeReport, user?.id]);

  const [expandedSection, setExpandedSection] = useState<string | null>('rep_1'); // Pre-expand first section

  const handleGenerateReport = async () => {
    if (!activeChart) return;
    
    // Check tokens (requires 5 tokens)
    if (tokenStore.tokens < 5) {
      tokenStore.setPaywallVisible(true);
      return;
    }

    try {
      await generateReport(user!.id, activeChart.id);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  // Icon selector based on category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'career':
        return <Briefcase size={18} color={colors.accent} />;
      case 'relationships':
        return <Heart size={18} color={colors.accent} />;
      case 'yogas_doshas':
        return <Sparkles size={18} color={colors.accent} />;
      case 'personality':
      default:
        return <BookOpen size={18} color={colors.accent} />;
    }
  };

  if (!activeChart) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
            Vedic Interpretations
          </Text>
          <TokenBadge />
        </View>
        <EmptyState
          title="Cast Chart First"
          description="We need your exact birth coordinates to generate your personal Vedic analysis report."
          actionTitle="Go to Dashboard"
          onActionPress={() => {}}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Vedic Interpretations
        </Text>
        <TokenBadge />
      </View>

      {isGeneratingReport ? (
        <LoadingState fullscreen={false} />
      ) : activeReport ? (
        // Report List view
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.reportIntro}>
            <FileText size={28} color={colors.accent} style={{ marginBottom: 8 }} />
            <Text style={[styles.reportTitle, { color: colors.textPrimary, fontSize: typography.sizes.xl, fontFamily: typography.fonts.heading }]}>
              Personal Astrological Guide
            </Text>
            <Text style={[styles.reportMeta, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
              COMPILED FOR {activeChart.birthDetails.name.toUpperCase()} ON {new Date(activeReport.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.accordionContainer}>
            {(Array.isArray(activeReport?.sections) ? activeReport.sections : []).map((section) => {
              const isExpanded = expandedSection === section.id;
              return (
                <View
                  key={section.id}
                  style={[
                    styles.accordionItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isExpanded ? colors.accent : colors.border,
                      borderRadius: spacing.borderRadius.md,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => toggleSection(section.id)}
                    style={styles.accordionHeader}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      {getCategoryIcon(section.category)}
                      <Text style={[styles.sectionName, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodyBold }]}>
                        {section.title}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={18} color={colors.textSecondary} />
                    ) : (
                      <ChevronDown size={18} color={colors.textSecondary} />
                    )}
                  </Pressable>

                  {isExpanded && (
                    <View style={[styles.accordionBody, { borderTopColor: colors.border }]}>
                      <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.sizes.md, fontFamily: typography.fonts.body }]}>
                        {section.content}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        // Paywall CTA to generate report
        <View style={styles.ctaContainer}>
          <View style={[styles.iconShield, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Lock size={32} color={colors.accent} />
          </View>
          <Text style={[styles.ctaTitle, { color: colors.textPrimary, fontSize: typography.sizes.xl, fontFamily: typography.fonts.heading }]}>
            Unlock Full Report
          </Text>
          <Text style={[styles.ctaSubtitle, { color: colors.textSecondary, fontSize: typography.sizes.md, fontFamily: typography.fonts.body }]}>
            Generate a detailed 7-section Vedic interpretation report analyzing your career, relationships, personality, and yogas.
          </Text>

          <Card variant="flat" style={styles.reportSummaryCard}>
            <Text style={[styles.cardHeading, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }]}>
              What you will get:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                • Soul path & ascendant lord analysis
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                • Career alignments under Saturn
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                • Budhaditya & Gajakesari yoga checks
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                • Transits & current Ketu dasha interpretations
              </Text>
            </View>
          </Card>

          <Button
            title="Generate Full Report (5 Tokens)"
            onPress={handleGenerateReport}
            style={styles.generateButton}
          />
        </View>
      )}
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
    borderBottomColor: '#242235',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 96,
  },
  reportIntro: {
    alignItems: 'center',
    marginBottom: 24,
  },
  reportTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportMeta: {
    fontWeight: '600',
    letterSpacing: 1,
  },
  accordionContainer: {
    gap: 16,
  },
  accordionItem: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionName: {
    fontWeight: 'bold',
  },
  accordionBody: {
    padding: 16,
    borderTopWidth: 1,
  },
  bodyText: {
    lineHeight: 24,
  },
  ctaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconShield: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ctaSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  reportSummaryCard: {
    width: '100%',
    padding: 16,
    marginBottom: 24,
  },
  cardHeading: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bulletList: {
    gap: 6,
  },
  bulletPoint: {
    lineHeight: 18,
  },
  generateButton: {
    width: '100%',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  loaderTextMuted: {
    fontWeight: '500',
  },
});
export default ReportScreen;
