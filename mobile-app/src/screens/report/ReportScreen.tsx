import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sparkles, FileText, ChevronDown, ChevronUp, Lock, Briefcase,
  Heart, BookOpen, Hash, Award, Compass, User, Zap
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useChartStore } from '../../store/useChartStore';
import { kundaliApi } from '../../api/endpoints/kundali';
import { NumerologyData } from '../../api/types';
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

  // Screen level sub-tabs: 'vedic' vs 'numerology'
  const [activeTab, setActiveTab] = useState<'vedic' | 'numerology'>('vedic');

  // Numerology states
  const [numerologyData, setNumerologyData] = useState<NumerologyData | null>(null);
  const [isLoadingNumerology, setIsLoadingNumerology] = useState<boolean>(false);
  const [isGeneratingNumerology, setIsGeneratingNumerology] = useState<boolean>(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState<boolean>(false);

  // Reset attempt flag on chart change
  useEffect(() => {
    setNumerologyData(null);
    setHasAttemptedFetch(false);
  }, [activeChart?.id]);

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<string | null>('rep_1');
  const [expandedNumSection, setExpandedNumSection] = useState<string | null>('life_path');

  // Load cached Vedic report on mount
  useEffect(() => {
    if (activeChart && !activeReport && user) {
      loadCachedReport(user.id, activeChart.id).catch(e => {
        console.warn('Failed to load cached report on mount', e);
      });
    }
  }, [activeChart, activeReport, user?.id]);

  // Load cached Numerology report when switching to numerology tab
  const fetchNumerologyData = useCallback(async () => {
    if (!activeChart) return;
    setIsLoadingNumerology(true);
    setHasAttemptedFetch(true);
    try {
      const data = await kundaliApi.getNumerology(activeChart.id);
      setNumerologyData(data);
    } catch (err) {
      console.warn('Failed to fetch numerology data', err);
    } finally {
      setIsLoadingNumerology(false);
    }
  }, [activeChart?.id]);

  useEffect(() => {
    if (activeChart && activeTab === 'numerology' && !numerologyData && !isLoadingNumerology && !hasAttemptedFetch) {
      fetchNumerologyData();
    }
  }, [activeTab, activeChart, numerologyData, isLoadingNumerology, hasAttemptedFetch, fetchNumerologyData]);

  // Handle Vedic Report generation
  const handleGenerateReport = async () => {
    if (!activeChart) return;
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

  // Handle Numerology Report generation
  const handleGenerateNumerology = async () => {
    if (!activeChart) return;
    if (tokenStore.tokens < 5) {
      tokenStore.setPaywallVisible(true);
      return;
    }
    setIsGeneratingNumerology(true);
    try {
      const res = await kundaliApi.generateNumerology(activeChart.id);
      tokenStore.spendTokens(5, `Generated Numerology for ${activeChart.birthDetails.name}`);
      setNumerologyData(res);
    } catch (e) {
      console.error('Failed to generate numerology', e);
    } finally {
      setIsGeneratingNumerology(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const toggleNumSection = (id: string) => {
    setExpandedNumSection(expandedNumSection === id ? null : id);
  };

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
            Interpretations
          </Text>
          <TokenBadge />
        </View>
        <EmptyState
          title="Cast Chart First"
          description="We need your exact birth details to generate your personal Vedic & Numerology interpretations."
          actionTitle="Go to Dashboard"
          onActionPress={() => {}}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Interpretations
        </Text>
        <TokenBadge />
      </View>

      {/* Top Segmented Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={[styles.tabItem, activeTab === 'vedic' && { backgroundColor: colors.accent }]}
          onPress={() => setActiveTab('vedic')}
        >
          <Compass size={16} color={activeTab === 'vedic' ? colors.background : colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, { color: activeTab === 'vedic' ? colors.background : colors.textSecondary }]}>
            Vedic Astrology
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabItem, activeTab === 'numerology' && { backgroundColor: colors.accent }]}
          onPress={() => setActiveTab('numerology')}
        >
          <Hash size={16} color={activeTab === 'numerology' ? colors.background : colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, { color: activeTab === 'numerology' ? colors.background : colors.textSecondary }]}>
            Numerology
          </Text>
        </Pressable>
      </View>

      {/* Content Area */}
      {activeTab === 'vedic' ? (
        // ----- VEDIC ASTROLOGY TAB CONTENT -----
        isGeneratingReport ? (
          <LoadingState fullscreen={false} />
        ) : activeReport ? (
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
        )
      ) : (
        // ----- NUMEROLOGY TAB CONTENT -----
        isLoadingNumerology || isGeneratingNumerology ? (
          <LoadingState fullscreen={false} />
        ) : numerologyData ? (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.reportIntro}>
              <Hash size={28} color={colors.accent} style={{ marginBottom: 8 }} />
              <Text style={[styles.reportTitle, { color: colors.textPrimary, fontSize: typography.sizes.xl, fontFamily: typography.fonts.heading }]}>
                Pythagorean Numerology Profile
              </Text>
              <Text style={[styles.reportMeta, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                CALCULATED FOR {activeChart.birthDetails.name.toUpperCase()} ({activeChart.birthDetails.dateOfBirth})
              </Text>
            </View>

            {/* Core Numbers 6-Grid */}
            <Text style={[styles.gridHeading, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
              Your Core Numbers
            </Text>
            <View style={styles.numGrid}>
              <Card variant="flat" style={styles.numCard}>
                <View style={styles.numBadge}>
                  <Text style={[styles.numValue, { color: colors.accent }]}>
                    {numerologyData.numbers.life_path_number}
                  </Text>
                </View>
                <Text style={[styles.numLabel, { color: colors.textPrimary }]}>Life Path</Text>
                <Text style={[styles.numSub, { color: colors.textSecondary }]}>Primary life purpose</Text>
              </Card>

              <Card variant="flat" style={styles.numCard}>
                <View style={styles.numBadge}>
                  <Text style={[styles.numValue, { color: colors.accent }]}>
                    {numerologyData.numbers.destiny_number}
                  </Text>
                </View>
                <Text style={[styles.numLabel, { color: colors.textPrimary }]}>Destiny</Text>
                <Text style={[styles.numSub, { color: colors.textSecondary }]}>Core expression & talents</Text>
              </Card>

              <Card variant="flat" style={styles.numCard}>
                <View style={styles.numBadge}>
                  <Text style={[styles.numValue, { color: colors.accent }]}>
                    {numerologyData.numbers.soul_urge_number}
                  </Text>
                </View>
                <Text style={[styles.numLabel, { color: colors.textPrimary }]}>Soul Urge</Text>
                <Text style={[styles.numSub, { color: colors.textSecondary }]}>Inner heart's desire</Text>
              </Card>

              <Card variant="flat" style={styles.numCard}>
                <View style={styles.numBadge}>
                  <Text style={[styles.numValue, { color: colors.accent }]}>
                    {numerologyData.numbers.personality_number}
                  </Text>
                </View>
                <Text style={[styles.numLabel, { color: colors.textPrimary }]}>Personality</Text>
                <Text style={[styles.numSub, { color: colors.textSecondary }]}>Outer projection</Text>
              </Card>

              <Card variant="flat" style={styles.numCard}>
                <View style={styles.numBadge}>
                  <Text style={[styles.numValue, { color: colors.accent }]}>
                    {numerologyData.numbers.birthday_number}
                  </Text>
                </View>
                <Text style={[styles.numLabel, { color: colors.textPrimary }]}>Birthday</Text>
                <Text style={[styles.numSub, { color: colors.textSecondary }]}>Special gift & day energy</Text>
              </Card>

              <Card variant="flat" style={styles.numCard}>
                <View style={styles.numBadge}>
                  <Text style={[styles.numValue, { color: colors.accent }]}>
                    {numerologyData.numbers.maturity_number}
                  </Text>
                </View>
                <Text style={[styles.numLabel, { color: colors.textPrimary }]}>Maturity</Text>
                <Text style={[styles.numSub, { color: colors.textSecondary }]}>Second half of life</Text>
              </Card>
            </View>

            {/* AI Numerology Interpretations Accordion */}
            <Text style={[styles.gridHeading, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading, marginTop: 20 }]}>
              AI Interpretations & Synthesis
            </Text>

            <View style={styles.accordionContainer}>
              {[
                { id: 'life_path', title: 'Life Path Interpretation', content: numerologyData.sections.life_path_meaning, icon: <Compass size={18} color={colors.accent} /> },
                { id: 'destiny', title: 'Destiny & Talents', content: numerologyData.sections.destiny_meaning, icon: <Award size={18} color={colors.accent} /> },
                { id: 'soul_urge', title: 'Soul Urge & Inner Desires', content: numerologyData.sections.soul_urge_meaning, icon: <Heart size={18} color={colors.accent} /> },
                { id: 'personality', title: 'Personality & Outer Impression', content: numerologyData.sections.personality_meaning, icon: <User size={18} color={colors.accent} /> },
                { id: 'overall_synthesis', title: 'Overall Numerology Synthesis', content: numerologyData.sections.overall_synthesis, icon: <Zap size={18} color={colors.accent} /> },
              ].map((item) => {
                const isExpanded = expandedNumSection === item.id;
                return (
                  <View
                    key={item.id}
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
                      onPress={() => toggleNumSection(item.id)}
                      style={styles.accordionHeader}
                    >
                      <View style={styles.accordionHeaderLeft}>
                        {item.icon}
                        <Text style={[styles.sectionName, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodyBold }]}>
                          {item.title}
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
                          {item.content}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          // Numerology Unlock Paywall CTA
          <View style={styles.ctaContainer}>
            <View style={[styles.iconShield, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Lock size={32} color={colors.accent} />
            </View>
            <Text style={[styles.ctaTitle, { color: colors.textPrimary, fontSize: typography.sizes.xl, fontFamily: typography.fonts.heading }]}>
              Unlock Numerology Matrix
            </Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textSecondary, fontSize: typography.sizes.md, fontFamily: typography.fonts.body }]}>
              Calculate your 6 Pythagorean core numbers derived from your birth name & date, plus AI synthesis.
            </Text>

            <Card variant="flat" style={styles.reportSummaryCard}>
              <Text style={[styles.cardHeading, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }]}>
                What you will get:
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  • Life Path Number (Primary Life Purpose)
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  • Destiny Number (Core Expression & Talents)
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  • Soul Urge Number (Deep Motivation)
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  • Personality, Birthday & Maturity Numbers
                </Text>
                <Text style={[styles.bulletPoint, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  • Comprehensive AI Synthesis
                </Text>
              </View>
            </Card>

            <Button
              title="Generate Numerology Profile (5 Tokens)"
              onPress={handleGenerateNumerology}
              style={styles.generateButton}
            />
          </View>
        )
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 4,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 96,
  },
  reportIntro: {
    alignItems: 'center',
    marginBottom: 20,
  },
  reportTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportMeta: {
    fontWeight: '600',
    letterSpacing: 1,
  },
  gridHeading: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  numGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  numCard: {
    width: '48%',
    padding: 14,
    alignItems: 'center',
  },
  numBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2640',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  numValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  numLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  numSub: {
    fontSize: 10,
    textAlign: 'center',
  },
  accordionContainer: {
    gap: 14,
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
});

export default ReportScreen;
