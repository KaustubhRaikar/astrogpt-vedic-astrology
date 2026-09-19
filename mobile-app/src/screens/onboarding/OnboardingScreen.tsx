import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import Button from '../../components/Button';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    title: 'Your Astrological Blueprint',
    subtitle: 'Cast highly precise Kundali charts computed using Swiss Ephemeris data for exact planetary placements.',
    badge: 'ACCURACY',
    icon: (accent: string) => (
      <Svg height="180" width="180" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="grad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#12111A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="40" fill="url(#grad)" />
        <Circle cx="50" cy="50" r="30" stroke={accent} strokeWidth="1" fill="none" strokeDasharray="3,3" />
        <Path d="M 50 10 L 50 90 M 10 50 L 90 50 M 20 20 L 80 80 M 80 20 L 20 80" stroke={accent} strokeWidth="0.75" strokeOpacity="0.5" />
        <Circle cx="50" cy="50" r="4" fill={accent} />
        <Circle cx="25" cy="25" r="3" fill="#FFF" />
        <Circle cx="75" cy="40" r="2" fill="#FFF" />
        <Circle cx="30" cy="70" r="3.5" fill="#FFF" />
      </Svg>
    ),
  },
  {
    title: 'Grounded AI Insights',
    subtitle: 'Consult our Gemini-powered guide on career, relationships, and health. Expect specific Vedic interpretations, never generic horoscopes.',
    badge: 'VEDIC INTEGRATION',
    icon: (accent: string) => (
      <Svg height="180" width="180" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="grad2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#12111A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="45" fill="url(#grad2)" />
        <Path d="M 50 20 L 53 43 L 75 46 L 55 53 L 60 75 L 50 58 L 40 75 L 45 53 L 25 46 L 47 43 Z" fill={accent} />
        <Circle cx="20" cy="20" r="1.5" fill="#FFF" />
        <Circle cx="80" cy="80" r="2" fill="#FFF" />
      </Svg>
    ),
  },
  {
    title: 'Unlock Cosmic Timing',
    subtitle: 'Track your current Dasha periods (Mahadashas and Antardashas) to understand the changing seasons of your life.',
    badge: 'TIMELINE',
    icon: (accent: string) => (
      <Svg height="180" width="180" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="grad3" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#12111A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="45" fill="url(#grad3)" />
        <Path d="M 15 50 Q 50 20 85 50 Q 50 80 15 50 Z" stroke={accent} strokeWidth="1.5" fill="none" />
        <Circle cx="50" cy="50" r="12" stroke={accent} strokeWidth="1" fill="none" />
        <Circle cx="40" cy="45" r="2" fill="#FFF" />
        <Circle cx="60" cy="55" r="2" fill="#FFF" />
      </Svg>
    ),
  },
];

export const OnboardingScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const setOnboardingSeen = useSessionStore((state) => state.setOnboardingSeen);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setOnboardingSeen(true);
    }
  };

  const item = ONBOARDING_DATA[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Text style={[styles.appTitle, { color: colors.accent, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
            ASTRÖGPT
          </Text>
          <Button
            title="Skip"
            variant="ghost"
            onPress={() => {
              setOnboardingSeen(true);
            }}
            textStyle={{ color: colors.textSecondary }}
          />
        </View>

        <Animated.View
          key={currentIndex}
          entering={FadeInRight.duration(400)}
          exiting={FadeOutLeft.duration(400)}
          style={styles.slide}
        >
          <View style={styles.iconWrapper}>{item.icon(colors.accent)}</View>

          <View style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.accent, fontSize: typography.sizes.xs }]}>
              {item.badge}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.sizes.xxl, fontFamily: typography.fonts.heading }]}>
            {item.title}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.md, fontFamily: typography.fonts.body }]}>
            {item.subtitle}
          </Text>
        </Animated.View>

        <View style={styles.bottomSection}>
          <View style={styles.indicatorContainer}>
            {ONBOARDING_DATA.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  {
                    backgroundColor: index === currentIndex ? colors.accent : colors.border,
                    width: index === currentIndex ? 24 : 8,
                    borderRadius: spacing.borderRadius.round,
                  },
                ]}
              />
            ))}
          </View>

          <Button
            title={currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            style={styles.nextButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  appTitle: {
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  iconWrapper: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: {
    fontWeight: '600',
    letterSpacing: 1,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 32,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  bottomSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  indicatorContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  indicator: {
    height: 8,
    marginHorizontal: 4,
  },
  nextButton: {
    width: '100%',
  },
});
export default OnboardingScreen;
