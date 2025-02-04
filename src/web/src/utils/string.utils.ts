/**
 * @fileoverview String manipulation utilities with Unicode and i18n support
 * @version 1.0.0
 */

// Constants
const ELLIPSIS = '...';
const MAX_STRING_LENGTH = 50;
const SPECIAL_CHARS_REGEX = /[^\p{L}\p{N}\s-]/gu;
const NUMBER_FORMAT_OPTIONS = { maximumFractionDigits: 2, useGrouping: true };

// Type definitions
export namespace StringUtilsTypes {
  export interface FormatOptions {
    maxLength?: number;
    preserveWords?: boolean;
  }

  export interface LocaleOptions {
    locale?: string;
    fallbackLocale?: string;
  }
}

/**
 * Namespace containing string manipulation utilities with Unicode support
 */
export namespace StringUtils {
  /**
   * Capitalizes the first letter of a string with full Unicode support
   * @param value - Input string to capitalize
   * @returns Capitalized string or empty string if input is invalid
   */
  export function capitalize(value: string | undefined | null): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Handle empty string case
    if (value.length === 0) {
      return '';
    }

    // Use Unicode-aware operations
    const firstChar = [...value][0];
    const rest = [...value].slice(1).join('');

    return firstChar.toLocaleUpperCase() + rest;
  }

  /**
   * Truncates a string to specified length while preserving Unicode character integrity
   * @param text - Input string to truncate
   * @param maxLength - Maximum length for the truncated string
   * @returns Truncated string with ellipsis if needed
   */
  export function truncate(text: string | undefined | null, maxLength: number): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    if (maxLength < 0) {
      throw new Error('maxLength must be a positive number');
    }

    // Convert to array of Unicode characters
    const chars = [...text];

    if (chars.length <= maxLength) {
      return text;
    }

    // Account for ellipsis in the maxLength
    const truncatedChars = chars.slice(0, maxLength - ELLIPSIS.length);
    return truncatedChars.join('') + ELLIPSIS;
  }

  /**
   * Converts a string to URL-friendly slug with Unicode support
   * @param text - Input string to convert to slug
   * @returns URL-friendly slug string
   */
  export function slugify(text: string | undefined | null): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      // Normalize Unicode characters
      .normalize('NFKC')
      // Convert to lowercase
      .toLocaleLowerCase()
      // Replace spaces with hyphens
      .replace(/\s+/g, '-')
      // Remove special characters while preserving Unicode letters and numbers
      .replace(SPECIAL_CHARS_REGEX, '')
      // Replace multiple consecutive hyphens with single hyphen
      .replace(/-+/g, '-')
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Formats number as locale-aware string with thousand separators
   * @param value - Number or string to format
   * @param locale - Locale identifier (e.g., 'en-US')
   * @returns Locale-formatted number string
   */
  export function formatNumber(
    value: number | string | undefined | null,
    locale: string = 'en-US'
  ): string {
    // Handle invalid input cases
    if (value === null || value === undefined) {
      return '';
    }

    // Convert string to number if needed
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Validate number
    if (typeof numValue !== 'number' || isNaN(numValue)) {
      return '';
    }

    try {
      // Use Intl.NumberFormat for locale-aware formatting
      const formatter = new Intl.NumberFormat(locale, NUMBER_FORMAT_OPTIONS);
      return formatter.format(numValue);
    } catch (error) {
      // Fallback to default locale if specified locale is invalid
      const fallbackFormatter = new Intl.NumberFormat('en-US', NUMBER_FORMAT_OPTIONS);
      return fallbackFormatter.format(numValue);
    }
  }
}