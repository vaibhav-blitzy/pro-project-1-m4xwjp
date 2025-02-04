// @fontsource/roboto v5.0.8 - Primary font family for Material Design
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// @fontsource/inter v5.0.8 - Secondary system font for enhanced readability
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';

// Type definitions for font configuration
type FontWeight = 300 | 400 | 500 | 700;
type FontStyle = 'normal' | 'italic';
type FontDisplay = 'swap' | 'block' | 'fallback' | 'optional';
type FontFamily = 'Roboto' | 'Inter';

interface FontDefinition {
  family: FontFamily;
  weight: FontWeight;
  style: FontStyle;
  display: FontDisplay;
  url: string;
}

// Font weight constants for type-safe usage
export const FONT_WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
} as const;

// Font style constants for consistent text emphasis
export const FONT_STYLES = {
  normal: 'normal',
  italic: 'italic',
} as const;

// Font display strategies for optimized loading
export const FONT_DISPLAY = {
  swap: 'swap',
  block: 'block',
  fallback: 'fallback',
  optional: 'optional',
} as const;

/**
 * Generates optimized URL for dynamic font loading with caching and version support
 * @param family - Font family name
 * @param weight - Font weight value
 * @param style - Font style
 * @param display - Font display strategy
 * @returns Optimized font URL
 */
const getFontUrl = (
  family: FontFamily,
  weight: FontWeight,
  style: FontStyle = FONT_STYLES.normal,
  display: FontDisplay = FONT_DISPLAY.swap
): string => {
  // Validate font family
  if (!['Roboto', 'Inter'].includes(family)) {
    throw new Error(`Unsupported font family: ${family}`);
  }

  // Validate font weight
  if (!Object.values(FONT_WEIGHTS).includes(weight)) {
    throw new Error(`Invalid font weight: ${weight}`);
  }

  // Construct version-aware base URL
  const version = family === 'Roboto' ? '5.0.8' : '5.0.8';
  const baseUrl = `/@fontsource/${family.toLowerCase()}/${version}`;

  // Construct complete URL with parameters
  return `${baseUrl}/${weight}-${style}.css?display=${display}&v=${version}`;
};

// Roboto font definitions with comprehensive weight support
export const robotoFont = {
  light: {
    family: 'Roboto' as FontFamily,
    weight: FONT_WEIGHTS.light,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Roboto', FONT_WEIGHTS.light),
  },
  regular: {
    family: 'Roboto' as FontFamily,
    weight: FONT_WEIGHTS.regular,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Roboto', FONT_WEIGHTS.regular),
  },
  medium: {
    family: 'Roboto' as FontFamily,
    weight: FONT_WEIGHTS.medium,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Roboto', FONT_WEIGHTS.medium),
  },
  bold: {
    family: 'Roboto' as FontFamily,
    weight: FONT_WEIGHTS.bold,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Roboto', FONT_WEIGHTS.bold),
  },
} as const;

// Inter font definitions for secondary typography
export const interFont = {
  light: {
    family: 'Inter' as FontFamily,
    weight: FONT_WEIGHTS.light,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Inter', FONT_WEIGHTS.light),
  },
  regular: {
    family: 'Inter' as FontFamily,
    weight: FONT_WEIGHTS.regular,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Inter', FONT_WEIGHTS.regular),
  },
  medium: {
    family: 'Inter' as FontFamily,
    weight: FONT_WEIGHTS.medium,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Inter', FONT_WEIGHTS.medium),
  },
  bold: {
    family: 'Inter' as FontFamily,
    weight: FONT_WEIGHTS.bold,
    style: FONT_STYLES.normal,
    display: FONT_DISPLAY.swap,
    url: getFontUrl('Inter', FONT_WEIGHTS.bold),
  },
} as const;

// Type exports for consuming components
export type { FontWeight, FontStyle, FontDisplay, FontFamily, FontDefinition };