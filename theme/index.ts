import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A', // Slate 900
    textMuted: '#64748B', // Slate 500
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    border: '#E2E8F0', // Slate 200
    primary: '#10B981', // Emerald 500
    primaryMuted: '#D1FAE5', // Emerald 100
    danger: '#F43F5E', // Rose 500
    dangerMuted: '#FFE4E6', // Rose 100
    warning: '#F59E0B', // Amber 500
    warningMuted: '#FEF3C7', // Amber 100
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    glassBackground: 'rgba(255, 255, 255, 0.7)',
  },
  dark: {
    text: '#F8FAFC', // Slate 50
    textMuted: '#94A3B8', // Slate 400
    background: '#0F172A', // Slate 900
    surface: '#1E293B', // Slate 800
    border: '#334155', // Slate 700
    primary: '#10B981', // Emerald 500
    primaryMuted: '#064E3B', // Emerald 900
    danger: '#F43F5E', // Rose 500
    dangerMuted: '#881337', // Rose 900
    warning: '#F59E0B', // Amber 500
    warningMuted: '#78350F', // Amber 900
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    glassBackground: 'rgba(15, 23, 42, 0.7)',
  },
};

export const Typography = {
  family: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const useThemeColor = () => {
  const colorScheme = useColorScheme() ?? 'light';
  return Colors[colorScheme];
};

export const useTheme = () => {
  const colorScheme = useColorScheme() ?? 'light';
  return {
    colors: Colors[colorScheme],
    isDark: colorScheme === 'dark',
    typography: Typography,
    spacing: Spacing,
    radii: Radii,
    shadows: Shadows,
  };
};
