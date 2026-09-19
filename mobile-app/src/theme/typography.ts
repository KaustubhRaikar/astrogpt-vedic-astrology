// Design System Typography for AstroGPT / KundaliGPT

export const typography = {
  fonts: {
    heading: 'Outfit-Bold',     // Loaded via expo-font
    body: 'Inter-Regular',       // Loaded via expo-font
    bodyMedium: 'Inter-Medium',
    bodySemibold: 'Inter-SemiBold',
    bodyBold: 'Inter-Bold',
    
    // System fallbacks in case fonts aren't ready
    systemHeading: 'System',
    systemBody: 'System',
  },
  
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  
  lineHeights: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 28,
    xxl: 32,
    xxxl: 40,
    display: 48,
  },

  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '900' as const,
  }
};
