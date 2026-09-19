import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionTitle?: string;
  onActionPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionTitle,
  onActionPress,
  icon,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderRadius: spacing.borderRadius.round, padding: spacing.md, marginBottom: spacing.md }]}>
        {icon || <Sparkles size={32} color={colors.accent} />}
      </View>
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            fontSize: typography.sizes.lg,
            fontFamily: typography.fonts.heading,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.sm,
            fontFamily: typography.fonts.body,
            marginBottom: actionTitle ? spacing.lg : 0,
          },
        ]}
      >
        {description}
      </Text>
      {actionTitle && onActionPress && (
        <Button title={actionTitle} onPress={onActionPress} style={styles.button} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    alignSelf: 'stretch',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  button: {
    minWidth: 160,
  },
});
export default EmptyState;
