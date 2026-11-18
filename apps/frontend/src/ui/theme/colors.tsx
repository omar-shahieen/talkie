import { useColorMode } from '@chakra-ui/react';

export const colors = {
  white: '#F3F4F6',
  primary: '#5E6AD2',
  dark: '#F3F4F6',
  darkLight: '#1E222E',
  darkMedium: '#171A23',
  darker: '#12151C',

  lightGray: '#9CA3AF',
  grayLight: '#12151C',
  grayMedium: '#0E1015',
  grayDark: '#0B0D12',
  grayDarkest: '#08090D',

  // Semantic mappings
  textMain: '#F3F4F6',
  textDim: '#9CA3AF',
  textMuted: '#6B7280',
  bgMain: '#12151C',

  // Professional design tokens
  border: 'rgba(255, 255, 255, 0.07)',
  borderStrong: 'rgba(255, 255, 255, 0.13)',
  surfaceElevated: '#171A23',
  accent: '#5E6AD2',
  accentHover: '#6E7AE2',
  accentSoft: 'rgba(94, 106, 210, 0.14)',
  danger: '#E11D48',
  success: '#10B981',
  warning: '#F59E0B',
  glassBg: 'rgba(18, 21, 28, 0.85)',
  messageHover: 'rgba(255, 255, 255, 0.024)',
};

export const lightColors = {
  white: '#111827',
  primary: '#4F5BD5',
  dark: '#111827',
  darkLight: '#EDF0F5',
  darkMedium: '#FFFFFF',
  darker: '#F8F9FB',

  lightGray: '#4B5563',
  grayLight: '#FFFFFF',
  grayMedium: '#F8F9FB',
  grayDark: '#F1F3F7',
  grayDarkest: '#E5E8F0',

  // Semantic mappings
  textMain: '#111827',
  textDim: '#4B5563',
  textMuted: '#6B7280',
  bgMain: '#FFFFFF',

  // Professional design tokens
  border: 'rgba(17, 24, 39, 0.08)',
  borderStrong: 'rgba(17, 24, 39, 0.15)',
  surfaceElevated: '#FFFFFF',
  accent: '#4F5BD5',
  accentHover: '#434EC2',
  accentSoft: 'rgba(79, 91, 213, 0.1)',
  danger: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  glassBg: 'rgba(255, 255, 255, 0.88)',
  messageHover: 'rgba(17, 24, 39, 0.022)',
};

export function useThemedColors() {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? colors : lightColors;
}
