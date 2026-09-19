import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Sparkles, Compass } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

interface LoadingStateProps {
  message?: string;
  fullscreen?: boolean;
  steps?: string[];
}

const DEFAULT_STEPS = [
  'Reading natal chart & divisional positions...',
  'Analyzing Mahadasha & planetary transits...',
  'Synthesizing Career, Health & Wealth houses...',
  'Evaluating Marriage & Relationship yogas...',
  'Finalizing deep multi-agent spiritual report...',
];

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Calculating celestial coordinates...',
  fullscreen = true,
  steps = DEFAULT_STEPS,
}) => {
  const { colors, spacing, typography } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (!steps || steps.length === 0) return;

    progressWidth.value = withTiming(((currentStep + 1) / steps.length) * 100, { duration: 1000 });

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          const next = prev + 1;
          progressWidth.value = withTiming(((next + 1) / steps.length) * 100, { duration: 1000 });
          return next;
        }
        return prev;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [steps]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  return (
    <View
      style={[
        styles.container,
        fullscreen ? styles.fullscreen : styles.inline,
        { backgroundColor: fullscreen ? colors.background : 'transparent' },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent }]}>
        <Sparkles size={32} color={colors.accent} />
      </View>

      <Text
        style={[
          styles.text,
          {
            color: colors.textPrimary,
            fontSize: typography.sizes.md,
            fontFamily: typography.fonts.heading,
            marginTop: spacing.md,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {steps[currentStep] || message}
      </Text>

      <Text style={{ color: colors.accent, fontSize: 11, fontFamily: typography.fonts.bodyBold, marginBottom: spacing.md }}>
        STEP {currentStep + 1} OF {steps.length} • MULTI-AGENT AI PIPELINE
      </Text>

      {/* Progress Bar Container */}
      <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Animated.View style={[styles.progressBarFill, { backgroundColor: colors.accent }, animatedProgressStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullscreen: {
    flex: 1,
  },
  inline: {
    alignSelf: 'stretch',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  text: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 6,
    width: '80%',
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
export default LoadingState;
