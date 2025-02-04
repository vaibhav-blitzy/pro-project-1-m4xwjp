/**
 * @fileoverview Comprehensive date utility functions for task management system
 * Implements internationalization, timezone handling, and timeline features
 * @version 1.0.0
 */

import dayjs from 'dayjs'; // v1.11.9
import utc from 'dayjs/plugin/utc'; // v1.11.9
import timezone from 'dayjs/plugin/timezone'; // v1.11.9
import relativeTime from 'dayjs/plugin/relativeTime'; // v1.11.9
import { DATE_FORMATS } from '../constants/app.constants';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

/**
 * Formats a date string or Date object according to the specified format with timezone support
 * @param date - The date to format
 * @param format - The desired output format (defaults to DISPLAY_DATE)
 * @param timezone - Optional timezone (defaults to user's local timezone)
 * @returns Formatted date string
 * @throws Error if date is invalid
 */
export const formatDate = (
  date: string | Date | number,
  format: string = DATE_FORMATS.DISPLAY_DATE,
  timezone?: string
): string => {
  try {
    if (!date) {
      throw new Error('Date parameter is required');
    }

    let dateObj = dayjs.utc(date);
    if (timezone) {
      dateObj = dateObj.tz(timezone);
    }

    if (!dateObj.isValid()) {
      throw new Error('Invalid date provided');
    }

    return dateObj.format(format);
  } catch (error) {
    console.error('Error formatting date:', error);
    throw error;
  }
};

/**
 * Parses a date string into a Date object with enhanced error handling
 * @param dateString - The date string to parse
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Parsed Date object
 * @throws Error if date string is invalid
 */
export const parseDate = (dateString: string, timezone?: string): Date => {
  try {
    if (!dateString) {
      throw new Error('Date string is required');
    }

    let parsedDate = dayjs.utc(dateString);
    if (timezone) {
      parsedDate = parsedDate.tz(timezone);
    }

    if (!parsedDate.isValid()) {
      throw new Error('Invalid date string format');
    }

    return parsedDate.toDate();
  } catch (error) {
    console.error('Error parsing date:', error);
    throw error;
  }
};

/**
 * Returns a localized human-readable relative time string
 * @param date - The date to compare against current time
 * @param timezone - Optional timezone for comparison
 * @returns Localized relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (
  date: string | Date | number,
  timezone?: string
): string => {
  try {
    if (!date) {
      throw new Error('Date parameter is required');
    }

    let dateObj = dayjs.utc(date);
    if (timezone) {
      dateObj = dateObj.tz(timezone);
    }

    if (!dateObj.isValid()) {
      throw new Error('Invalid date provided');
    }

    return dateObj.fromNow();
  } catch (error) {
    console.error('Error getting relative time:', error);
    throw error;
  }
};

/**
 * Validates if the provided date string or Date object is valid
 * @param date - The date to validate
 * @returns Boolean indicating if date is valid
 */
export const isValidDate = (date: string | Date | number): boolean => {
  if (!date) return false;

  const dateObj = dayjs.utc(date);
  if (!dateObj.isValid()) return false;

  // Check for reasonable date range (between 1900 and 100 years from now)
  const year = dateObj.year();
  const currentYear = dayjs().year();
  return year >= 1900 && year <= currentYear + 100;
};

/**
 * Calculates start and end dates for timeline views with timezone support
 * @param rangeType - Type of range to calculate
 * @param date - Reference date for range calculation
 * @param timezone - Optional timezone
 * @returns Object containing start date, end date, and duration
 */
export const getDateRange = (
  rangeType: 'day' | 'week' | 'month' | 'year',
  date: string | Date | number,
  timezone?: string
): { start: Date; end: Date; duration: number } => {
  try {
    let dateObj = dayjs.utc(date);
    if (timezone) {
      dateObj = dateObj.tz(timezone);
    }

    if (!dateObj.isValid()) {
      throw new Error('Invalid date provided');
    }

    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;

    switch (rangeType) {
      case 'day':
        start = dateObj.startOf('day');
        end = dateObj.endOf('day');
        break;
      case 'week':
        start = dateObj.startOf('week');
        end = dateObj.endOf('week');
        break;
      case 'month':
        start = dateObj.startOf('month');
        end = dateObj.endOf('month');
        break;
      case 'year':
        start = dateObj.startOf('year');
        end = dateObj.endOf('year');
        break;
      default:
        throw new Error('Invalid range type');
    }

    return {
      start: start.toDate(),
      end: end.toDate(),
      duration: end.diff(start)
    };
  } catch (error) {
    console.error('Error calculating date range:', error);
    throw error;
  }
};

/**
 * Formats a duration in milliseconds to a localized human-readable string
 * @param milliseconds - Duration in milliseconds
 * @param format - Format style for the output
 * @returns Localized duration string
 */
export const formatDuration = (
  milliseconds: number,
  format: 'long' | 'short' | 'narrow' = 'long'
): string => {
  try {
    if (milliseconds < 0) {
      throw new Error('Duration cannot be negative');
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days}${format === 'narrow' ? 'd' : format === 'short' ? ' days' : ' days'}`);
    }
    if (hours % 24 > 0) {
      parts.push(`${hours % 24}${format === 'narrow' ? 'h' : format === 'short' ? ' hrs' : ' hours'}`);
    }
    if (minutes % 60 > 0) {
      parts.push(`${minutes % 60}${format === 'narrow' ? 'm' : format === 'short' ? ' min' : ' minutes'}`);
    }
    if (seconds % 60 > 0 && format !== 'narrow') {
      parts.push(`${seconds % 60}${format === 'short' ? ' sec' : ' seconds'}`);
    }

    return parts.join(' ') || '0 seconds';
  } catch (error) {
    console.error('Error formatting duration:', error);
    throw error;
  }
};