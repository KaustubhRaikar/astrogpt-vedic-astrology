import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput as RNTextInput, TextInputProps as RNTextInputProps, Pressable, StyleProp, TextStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  secureTextEntry = false,
  style,
  onFocus,
  onBlur,
  icon,
  ...props
}) => {
  const { colors, spacing, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const showPasswordToggle = secureTextEntry;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xxs, fontSize: typography.sizes.sm }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : isFocused ? colors.accent : colors.border,
            borderRadius: spacing.borderRadius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {icon && <View style={{ marginRight: spacing.xs }}>{icon}</View>}
        <RNTextInput
          style={[
            styles.textInput,
            {
              color: colors.textPrimary,
              paddingVertical: spacing.md,
              fontSize: typography.sizes.md,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry && !passwordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />
        {showPasswordToggle && (
          <Pressable
            onPress={() => setPasswordVisible(!passwordVisible)}
            style={styles.toggleButton}
          >
            {passwordVisible ? (
              <EyeOff size={20} color={colors.textSecondary} />
            ) : (
              <Eye size={20} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error, marginTop: spacing.xxs, fontSize: typography.sizes.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontFamily: 'System',
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  textInput: {
    flex: 1,
    fontFamily: 'System',
  },
  toggleButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'System',
  },
});
export default TextInput;
