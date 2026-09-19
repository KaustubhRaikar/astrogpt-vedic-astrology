import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Compass, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { PlanetPosition } from '../../../api/types';
import Card from '../../../components/Card';

interface PlanetCardsProps {
  planets: PlanetPosition[];
}

export const PlanetCards: React.FC<PlanetCardsProps> = ({ planets }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.headerText, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
          Planetary Positions
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { gap: spacing.md }]}
      >
        {planets.map((item, index) => (
          <Card key={index} variant="elevated" style={styles.planetCard}>
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.planetName,
                  {
                    color: item.planet === 'Ascendant' ? colors.accent : colors.textPrimary,
                    fontSize: typography.sizes.md,
                    fontFamily: typography.fonts.heading,
                  },
                ]}
              >
                {item.planet}
              </Text>
              {item.isRetrograde && (
                <View style={[styles.retroBadge, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
                  <Text style={[styles.retroText, { color: colors.error, fontSize: 9 }]}>Rx</Text>
                </View>
              )}
            </View>

            <Text style={[styles.details, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              {item.sign} ({item.degree.toFixed(1)}°)
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.metaRow}>
              <View>
                <Text style={[styles.metaLabel, { color: colors.textMuted, fontSize: 10 }]}>HOUSE</Text>
                <Text style={[styles.metaVal, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }]}>
                  {item.house}
                </Text>
              </View>
              <View>
                <Text style={[styles.metaLabel, { color: colors.textMuted, fontSize: 10 }]}>NAKSHATRA</Text>
                <Text style={[styles.metaVal, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }]} numberOfLines={1}>
                  {item.nakshatra}
                </Text>
              </View>
            </View>
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
  planetCard: {
    width: 140,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planetName: {
    fontWeight: 'bold',
  },
  retroBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  retroText: {
    fontWeight: 'bold',
  },
  details: {
    marginBottom: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaLabel: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaVal: {
    fontWeight: 'bold',
  },
});
export default PlanetCards;
