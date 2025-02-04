/**
 * @fileoverview Advanced i18n configuration with comprehensive internationalization support
 * Implements multi-language, RTL, date/time localization, and number formatting
 * @version 1.0.0
 */

import i18next from 'i18next'; // v23.2.0
import { initReactI18next } from 'react-i18next'; // v13.0.0
import LanguageDetector from 'i18next-browser-languagedetector'; // v7.1.0
import dayjs from 'dayjs'; // v1.11.9
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Import language resources with type safety
import enTranslations from './en.json';
import esTranslations from './es.json';
import frTranslations from './fr.json';

// Type-safe language codes
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'] as const;
export const DEFAULT_LANGUAGE = 'en' as const;
export const LANGUAGE_STORAGE_KEY = 'app_language' as const;
export const RTL_LANGUAGES = ['ar', 'he'] as const;

// Type definitions for language configuration
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
type LanguageDirection = 'ltr' | 'rtl';

interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  direction: LanguageDirection;
  dateFormat: string;
  timeFormat: string;
  numberFormat: Intl.NumberFormatOptions;
}

// Language configuration with formatting options
const languageConfigs: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'hh:mm A',
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  },
  es: {
    code: 'es',
    name: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true,
    },
  },
  fr: {
    code: 'fr',
    name: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true,
    },
  },
};

// Configure dayjs plugins
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

/**
 * Returns text direction for a given language with memoization
 * @param language - Language code to check
 * @returns Text direction (rtl or ltr)
 */
export const getLanguageDirection = (language: string): LanguageDirection => {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
};

/**
 * Initializes i18next with comprehensive configurations
 * Includes error handling, type safety, and performance optimization
 */
export const initializeI18n = async (): Promise<void> => {
  try {
    // Initialize dayjs with supported locales
    SUPPORTED_LANGUAGES.forEach(lang => {
      dayjs.locale(lang);
    });

    await i18next
      .use(initReactI18next)
      .use(LanguageDetector)
      .init({
        resources: {
          en: enTranslations,
          es: esTranslations,
          fr: frTranslations,
        },
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES,
        defaultNS: 'common',
        ns: ['common'],
        
        // Advanced detection options
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          lookupLocalStorage: LANGUAGE_STORAGE_KEY,
          caches: ['localStorage'],
          cookieMinutes: 60 * 24 * 30, // 30 days
        },

        // Interpolation configuration
        interpolation: {
          escapeValue: false,
          format: (value, format, lng) => {
            if (!value) return '';
            
            if (format === 'date') {
              return dayjs(value)
                .locale(lng || DEFAULT_LANGUAGE)
                .format(languageConfigs[lng as SupportedLanguage]?.dateFormat);
            }
            
            if (format === 'time') {
              return dayjs(value)
                .locale(lng || DEFAULT_LANGUAGE)
                .format(languageConfigs[lng as SupportedLanguage]?.timeFormat);
            }
            
            if (format === 'number') {
              return new Intl.NumberFormat(
                lng || DEFAULT_LANGUAGE,
                languageConfigs[lng as SupportedLanguage]?.numberFormat
              ).format(value);
            }
            
            return value;
          },
        },

        // Performance optimizations
        load: 'languageOnly',
        preload: SUPPORTED_LANGUAGES,
        keySeparator: '.',
        nsSeparator: ':',

        // Error handling
        saveMissing: process.env.NODE_ENV === 'development',
        missingKeyHandler: (lng, ns, key) => {
          console.warn(`Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
        },
        parseMissingKeyHandler: (key) => `⚠️ ${key}`,
      });

  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    throw new Error(`i18n initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export configured i18next instance
export const i18n = i18next;

// Export type-safe translation function
export type TranslationKey = keyof typeof enTranslations.common;
export type TranslationFunction = (key: TranslationKey, options?: any) => string;

// Export language utilities
export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

export const getLanguageConfig = (lang: SupportedLanguage): LanguageConfig => {
  return languageConfigs[lang];
};

export const formatNumber = (
  value: number,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string => {
  return new Intl.NumberFormat(
    lang,
    languageConfigs[lang].numberFormat
  ).format(value);
};

export const formatDate = (
  date: Date | string | number,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string => {
  return dayjs(date)
    .locale(lang)
    .format(languageConfigs[lang].dateFormat);
};

export const formatTime = (
  time: Date | string | number,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string => {
  return dayjs(time)
    .locale(lang)
    .format(languageConfigs[lang].timeFormat);
};