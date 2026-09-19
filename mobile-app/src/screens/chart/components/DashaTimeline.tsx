import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { DashaPeriod } from '../../../api/types';
import Card from '../../../components/Card';

interface DashaTimelineProps {
  dashas: DashaPeriod[];
}

export const DashaTimeline: React.FC<DashaTimelineProps> = ({ dashas }) => {
  const { colors, spacing, typography } = useTheme();

  // Filter only antardashas for the sub-period timeline view
  const subDashas = dashas.filter((d) => d.type === 'antardasha');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calendar size={16} color={colors.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.headerText, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
          Dasha timeline (Antardashas)
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { gap: spacing.md }]}
      >
        {subDashas.map((item, index) => (
          <Card
            key={index}
            variant={item.isActive ? 'glow' : 'elevated'}
            style={[
              styles.dashaNode,
              item.isActive && { borderColor: colors.accent, borderWidth: 1.5 },
            ]}
          >
            {item.isActive && (
              <View style={[styles.activeBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.activeBadgeText, { color: colors.background === '#FAF9F6' ? '#FFF' : '#000', fontSize: 8 }]}>ACTIVE</Text>
              </View>
            )}
            <Text style={[styles.planetName, { color: item.isActive ? colors.accent : colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
              {item.planet} Dasha
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
              From: {item.startDate}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 }]}>
              To: {item.endDate}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  headerText: {
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  dashaNode: {
    width: 170,
    padding: 14,
    justifyContent: 'center',
    position: 'relative',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planetName: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateText: {
    fontFamily: 'System',
  },
});
export default DashaTimeline;
