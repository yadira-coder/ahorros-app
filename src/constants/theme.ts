/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1e1b1a',
    background: '#f7ede2',
    backgroundElement: 'rgba(255, 255, 255, 0.75)',
    backgroundSelected: '#efe6e5',
    textSecondary: '#504442',
    primary: '#775651',
    primaryContainer: '#f5cac3',
    secondary: '#84a59d',
    secondaryContainer: '#c7eae1',
    tertiary: '#7f5600',
    tertiaryContainer: '#ffcb7a',
    accent: '#f28482',
    error: '#ba1a1a',
    border: 'rgba(255, 255, 255, 0.4)',
  },
  dark: {
    text: '#1e1b1a',
    background: '#f7ede2',
    backgroundElement: 'rgba(255, 255, 255, 0.75)',
    backgroundSelected: '#efe6e5',
    textSecondary: '#504442',
    primary: '#775651',
    primaryContainer: '#f5cac3',
    secondary: '#84a59d',
    secondaryContainer: '#c7eae1',
    tertiary: '#7f5600',
    tertiaryContainer: '#ffcb7a',
    accent: '#f28482',
    error: '#ba1a1a',
    border: 'rgba(255, 255, 255, 0.4)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
