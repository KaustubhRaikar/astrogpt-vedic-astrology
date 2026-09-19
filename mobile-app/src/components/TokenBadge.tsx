import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
import { Coins, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useTokenStore } from '../store/useTokenStore';

export const TokenBadge: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const tokens = useTokenStore((state) => state.tokens);
  const setPaywallVisible = useTokenStore((state) => state.setPaywallVisible);
  const scale = useSharedValue(1);

  // Pulse effect when token balance changes
  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 5, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );
  }, [tokens]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Pressable
      onPress={() => setPaywallVisible(true)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.accent,
          paddingHorizontal: spacing.sm,
          paddingVertical: 5,
          borderRadius: spacing.borderRadius.round,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Animated.View style={[styles.innerContainer, animatedStyle]}>
        <Coins size={16} color={colors.accent} style={{ marginRight: 6 }} />
        <Text
          style={[
            styles.text,
            {
              color: colors.textPrimary,
              fontSize: typography.sizes.sm,
              fontFamily: typography.fonts.heading,
              marginRight: 6,
            },
          ]}
        >
          {tokens}
        </Text>
        <View style={[styles.plusBadge, { backgroundColor: colors.accent }]}>
          <Plus size={10} color={colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C'} />
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
  plusBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default TokenBadge;
