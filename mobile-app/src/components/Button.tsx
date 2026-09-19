import React from 'react';
import { StyleSheet, Text, ActivityIndicator, View, Pressable, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors, spacing, typography } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.accent,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return {
          color: colors.textPrimary,
        };
      case 'ghost':
        return {
          color: colors.accent,
        };
      case 'danger':
      case 'primary':
      default:
        return {
          color: colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C', // High contrast
          fontFamily: typography.fonts.heading,
          fontWeight: typography.weights.bold,
        };
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.baseButton,
        {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: spacing.borderRadius.lg,
          opacity: disabled ? 0.4 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        getButtonStyle(),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? (colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C') : colors.accent}
        />
      ) : (
        <View style={styles.contentContainer}>
          {icon && <View style={[styles.iconContainer, { marginRight: spacing.xs }]}>{icon}</View>}
          <Text
            style={[
              styles.baseText,
              {
                fontSize: typography.sizes.md,
                fontFamily: typography.fonts.bodySemibold,
              },
              getTextStyle(),
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseText: {
    textAlign: 'center',
  },
});
export default Button;
