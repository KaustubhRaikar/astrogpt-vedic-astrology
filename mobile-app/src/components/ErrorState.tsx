import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import Button from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  retryTitle?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'An unexpected planetary alignment interrupted the request.',
  onRetry,
  retryTitle = 'Try Again',
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.errorBg, borderRadius: spacing.borderRadius.round, padding: spacing.md, marginBottom: spacing.md }]}>
        <AlertCircle size={32} color={colors.error} />
      </View>
      <Text
        style={[
          styles.message,
          {
            color: colors.textPrimary,
            fontSize: typography.sizes.md,
            fontFamily: typography.fonts.bodyMedium,
            marginBottom: spacing.lg,
          },
        ]}
      >
        {message}
      </Text>
      <Button title={retryTitle} onPress={onRetry} variant="secondary" style={styles.button} />
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
  message: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  button: {
    minWidth: 160,
  },
});
export default ErrorState;
