/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const AppTheme = {
  colors: {
    primary: '#0f766e',
    secondary: '#fb923c',
    danger: '#dc2626',
    warning: '#f59e0b',
    text: '#0f172a',
    mutedText: '#475569',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#cbd5e1',
    dark: '#0f172a',
    white: '#ffffff',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },
  shadow: {
    card: {
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 4,
    },
  },
};

export const Colors = {
  light: {
    text: AppTheme.colors.text,
    background: AppTheme.colors.background,
    tint: AppTheme.colors.primary,
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: AppTheme.colors.primary,
  },
  dark: {
    text: '#e2e8f0',
    background: '#0f172a',
    tint: '#99f6e4',
    icon: '#cbd5e1',
    tabIconDefault: '#94a3b8',
    tabIconSelected: '#99f6e4',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Manrope', 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Space Grotesk', 'Manrope', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});

export const getResponsiveLayout = (width: number) => {
  if (width >= 1024) {
    return {
      horizontalPadding: 28,
      contentMaxWidth: 860,
      heroTitleSize: 36,
      heroTitleLineHeight: 42,
    };
  }

  if (width >= 768) {
    return {
      horizontalPadding: 24,
      contentMaxWidth: 720,
      heroTitleSize: 34,
      heroTitleLineHeight: 40,
    };
  }

  return {
    horizontalPadding: 16,
    contentMaxWidth: 560,
    heroTitleSize: 30,
    heroTitleLineHeight: 36,
  };
};
