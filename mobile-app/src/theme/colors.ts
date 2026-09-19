// Design System Colors for AstroGPT / KundaliGPT
// A premium celestial theme: deep slates/violets for dark mode, soft sand/cream/gold for light mode.

export const palette = {
  // Common neutrals
  white: '#FFFFFF',
  black: '#0A0A0C',

  // Gold & Amber Accents (Vedic Astrology)
  goldLight: '#E6C15C',
  gold: '#D4AF37', // Celestial gold
  goldDark: '#B3922E',
  goldGlow: 'rgba(212, 175, 55, 0.15)',

  // Deep Royal Violet & Slate (Spiritual / Premium)
  violet: '#6366F1',
  indigo: '#4F46E5',
  rose: '#FDA4AF',

  // Dark Mode Palette
  dark: {
    background: '#09080E',     // Deep space black
    surface: '#12111A',        // Elevated card
    surfaceElevated: '#1A1825', // High elevation card/dialog
    border: '#242235',         // Soft borders
    textPrimary: '#F3F4F6',    // Bright gray
    textSecondary: '#9CA3AF',  // Muted gray
    textMuted: '#6B7280',      // Very muted
    accent: '#D4AF37',         // Vedic gold
    accentHover: '#E6C15C',
    error: '#EF4444',
    errorBg: '#2E1010',
    success: '#10B981',
    successBg: '#0A251C',
    info: '#3B82F6',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },

  // Light Mode Palette
  light: {
    background: '#FAF9F6',     // Elegant alabaster / cream
    surface: '#FFFFFF',        // Pure white card
    surfaceElevated: '#F3F2EE', // Soft gray-sand elevated
    border: '#E8E6E0',         // Soft warm border
    textPrimary: '#1E1B18',    // Deep charcoal
    textSecondary: '#5C554E',  // Muted bronze-gray
    textMuted: '#8C8276',      // Warm muted
    accent: '#B3922E',         // Deep celestial gold
    accentHover: '#D4AF37',
    error: '#DC2626',
    errorBg: '#FEE2E2',
    success: '#059669',
    successBg: '#D1FAE5',
    info: '#2563EB',
    shadow: 'rgba(92, 85, 78, 0.08)',
  },
};

export type ThemeColors = typeof palette.dark;
