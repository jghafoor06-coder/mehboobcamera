import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const colors = {
  // Backgrounds
  background: '#050505',
  backgroundLight: '#0A0A0A',
  surface: '#141428',
  surfaceLight: '#1A1A30',
  surfaceElevated: '#1E1E36',
  card: '#121226',
  cardLight: '#181830',

  // Premium Glow (Indigo family for luxury fintech feel)
  premiumGlow: '#6C63FF',
  premiumGlowLight: '#7C73FF',
  premiumGlowBlue: '#5B8CFF',
  premiumGlowPurple: '#8B5CF6',

  // Primary gradient (Indigo → Purple)
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primaryGradient: ['#6366F1', '#8B5CF6'],

  // Secondary (Cyan)
  secondary: '#06B6D4',
  secondaryLight: '#22D3EE',
  secondaryGradient: ['#06B6D4', '#3B82F6'],

  // Accent (Amber/Gold)
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentGradient: ['#F59E0B', '#EF4444'],

  // Success
  success: '#10B981',
  successLight: '#34D399',
  successGradient: ['#10B981', '#06B6D4'],

  // Warning
  warning: '#F59E0B',
  warningLight: '#FBBF24',

  // Error
  error: '#EF4444',
  errorLight: '#F87171',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textMuted: '#4B5563',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderFocused: 'rgba(99, 102, 241, 0.5)',
  borderGlow: 'rgba(108, 99, 255, 0.25)',

  // Glassmorphism
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',

  // Glow (centralized for consistency)
  glowPrimary: 'rgba(99, 102, 241, 0.3)',
  glowSecondary: 'rgba(6, 182, 212, 0.3)',
  glowAccent: 'rgba(245, 158, 11, 0.3)',
  glowSuccess: 'rgba(16, 185, 129, 0.3)',
  glowPremium: 'rgba(108, 99, 255, 0.35)',
  glowPremiumSoft: 'rgba(108, 99, 255, 0.15)',

  // Gradient Border presets
  gradientBorderPrimary: ['rgba(99, 102, 241, 0.4)', 'rgba(139, 92, 246, 0.2)'],
  gradientBorderSuccess: ['rgba(16, 185, 129, 0.4)', 'rgba(6, 182, 212, 0.2)'],
  gradientBorderAccent: ['rgba(245, 158, 11, 0.4)', 'rgba(239, 68, 68, 0.2)'],

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
};

export const typography = {
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    huge: 34,
    massive: 40,
  },
  fontWeight: {
    regular: 'normal',
    medium: '500',
    semibold: '600',
    bold: 'bold',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};


export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  // Premium layered shadow for cards
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  }),
  // Layered glow for FAB and premium elements
  glowLayered: (color) => ({
    // Layered shadows not truly supported in RN, so we use the strongest one
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  }),
};

export const layout = {
  screenPadding: spacing.xl,
  cardPadding: spacing.lg,
  sectionGap: spacing.xxl,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isIOS: Platform.OS === 'ios',
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  layout,
};
