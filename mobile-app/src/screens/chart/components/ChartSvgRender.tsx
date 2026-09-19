import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../../theme/ThemeProvider';

interface ChartSvgRenderProps {
  svgString: string;
}

const { width } = Dimensions.get('window');
const CHART_SIZE = width - 48; // Padding offset

export const ChartSvgRender: React.FC<ChartSvgRenderProps> = ({ svgString }) => {
  const { colors, spacing } = useTheme();

  // Replace default colors in the SVG string dynamically to match active light/dark theme!
  // This makes the design look integrated and premium
  let themedSvg = svgString
    .replace(/fill="#12111A"/g, `fill="${colors.surface}"`)
    .replace(/stroke="#D4AF37"/g, `stroke="${colors.accent}"`)
    .replace(/fill="#8F7833"/g, `fill="${colors.textMuted}"`)
    .replace(/fill="#F3F4F6"/g, `fill="${colors.textPrimary}"`);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          borderRadius: spacing.borderRadius.lg,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.svgWrapper}>
        <SvgXml xml={themedSvg} width={CHART_SIZE - 24} height={CHART_SIZE - 24} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    padding: 12,
  },
  svgWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default ChartSvgRender;
