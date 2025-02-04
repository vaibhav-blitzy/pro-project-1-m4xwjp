/**
 * @fileoverview Centralized index for application image assets following Material Design 3 principles
 * @version 1.0.0
 */

// Supported image formats in order of preference
export const SUPPORTED_IMAGE_FORMATS = ['.webp', '.png', '.jpg', '.svg'] as const;

// Default avatar size following Material Design avatar guidelines
export const DEFAULT_AVATAR_SIZE = 40;

// Responsive breakpoints for image optimization
export const IMAGE_BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
} as const;

// Types
type ImageSize = 'small' | 'medium' | 'large';
type ThemeMode = 'light' | 'dark';
type ImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];

/**
 * Validates if the provided image format is supported
 * @param imagePath - Path of the image to validate
 * @returns boolean indicating if format is supported
 */
const validateImageFormat = (imagePath: string): boolean => {
  const extension = imagePath.substring(imagePath.lastIndexOf('.')) as ImageFormat;
  return SUPPORTED_IMAGE_FORMATS.includes(extension);
};

/**
 * Returns optimized image path based on format and size
 * @param imageName - Name of the image asset
 * @param size - Desired image size
 * @returns Full CDN path to the optimized image
 */
const getImagePath = (imageName: string, size: ImageSize): string => {
  if (!validateImageFormat(imageName)) {
    throw new Error(`Unsupported image format for: ${imageName}`);
  }

  const cdnPrefix = process.env.REACT_APP_CDN_URL || '';
  const sizePrefix = size === 'small' ? '@1x' : size === 'medium' ? '@2x' : '@3x';
  
  return `${cdnPrefix}/assets/images/${imageName}${sizePrefix}`;
};

// Default avatar placeholder following Material Design guidelines
export const defaultAvatar = getImagePath('default-avatar.webp', 'medium');

// Application logo variants for different theme modes
export const appLogo = {
  light: getImagePath('app-logo-light.svg', 'medium'),
  dark: getImagePath('app-logo-dark.svg', 'medium'),
} as const;

// Application state illustrations
export const stateImages = {
  empty: getImagePath('state-empty.webp', 'large'),
  error: getImagePath('state-error.webp', 'large'),
  loading: getImagePath('state-loading.webp', 'medium'),
} as const;

// Task priority level icons following Material Design
export const taskIcons = {
  high: getImagePath('priority-high.svg', 'small'),
  medium: getImagePath('priority-medium.svg', 'small'),
  low: getImagePath('priority-low.svg', 'small'),
} as const;

// Project status icons with Material Design states
export const projectIcons = {
  active: getImagePath('project-active.svg', 'small'),
  completed: getImagePath('project-completed.svg', 'small'),
  archived: getImagePath('project-archived.svg', 'small'),
} as const;

// Decorative illustrations for various application states
export const illustrationImages = {
  welcome: getImagePath('illustration-welcome.webp', 'large'),
  noResults: getImagePath('illustration-no-results.webp', 'large'),
  success: getImagePath('illustration-success.webp', 'large'),
} as const;

// Type exports for consuming components
export type { ImageSize, ThemeMode, ImageFormat };