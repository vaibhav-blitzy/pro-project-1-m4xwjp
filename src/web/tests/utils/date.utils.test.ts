import { describe, it, expect } from '@jest/globals'; // v29.5.0
import {
  formatDate,
  parseDate,
  getRelativeTime,
  isValidDate,
  getDateRange,
  formatDuration
} from '../../src/utils/date.utils';
import { DATE_FORMATS } from '../../src/constants/app.constants';

describe('formatDate', () => {
  const mockDate = new Date('2023-10-15T14:30:00Z');
  const mockTimezone = 'America/New_York';

  it('should format date with default format', () => {
    expect(formatDate(mockDate)).toBe('Oct 15, 2023');
  });

  it('should format date with custom format', () => {
    expect(formatDate(mockDate, DATE_FORMATS.DISPLAY_TIME)).toBe('2:30 PM');
  });

  it('should handle timezone conversion', () => {
    expect(formatDate(mockDate, DATE_FORMATS.DISPLAY_TIME, mockTimezone)).toBe('10:30 AM');
  });

  it('should throw error for invalid date', () => {
    expect(() => formatDate('invalid-date')).toThrow('Invalid date provided');
  });

  it('should handle null input', () => {
    expect(() => formatDate(null as any)).toThrow('Date parameter is required');
  });

  it('should format date for RTL locales', () => {
    // Using Arabic locale format
    expect(formatDate(mockDate, 'DD/MM/YYYY')).toBe('15/10/2023');
  });

  it('should handle DST transitions', () => {
    const dstDate = new Date('2023-03-12T02:30:00Z');
    expect(formatDate(dstDate, DATE_FORMATS.DISPLAY_TIME, mockTimezone)).toBe('10:30 PM');
  });
});

describe('parseDate', () => {
  const mockTimezone = 'Europe/London';

  it('should parse ISO 8601 date string', () => {
    const dateStr = '2023-10-15T14:30:00Z';
    const result = parseDate(dateStr);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe(dateStr);
  });

  it('should parse date with timezone', () => {
    const dateStr = '2023-10-15T14:30:00Z';
    const result = parseDate(dateStr, mockTimezone);
    expect(result).toBeInstanceOf(Date);
  });

  it('should throw error for invalid date string', () => {
    expect(() => parseDate('invalid')).toThrow('Invalid date string format');
  });

  it('should handle empty input', () => {
    expect(() => parseDate('')).toThrow('Date string is required');
  });

  it('should parse partial date string', () => {
    const result = parseDate('2023-10-15');
    expect(result.toISOString().startsWith('2023-10-15')).toBeTruthy();
  });
});

describe('getRelativeTime', () => {
  const now = new Date();
  const mockTimezone = 'Asia/Tokyo';

  it('should return relative time for past date', () => {
    const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago
    expect(getRelativeTime(pastDate)).toBe('an hour ago');
  });

  it('should return relative time for future date', () => {
    const futureDate = new Date(now.getTime() + 86400000); // 1 day ahead
    expect(getRelativeTime(futureDate)).toBe('in a day');
  });

  it('should handle timezone differences', () => {
    const date = new Date(now.getTime() - 3600000);
    expect(getRelativeTime(date, mockTimezone)).toMatch(/ago/);
  });

  it('should throw error for invalid date', () => {
    expect(() => getRelativeTime('invalid')).toThrow('Invalid date provided');
  });
});

describe('isValidDate', () => {
  it('should validate correct date object', () => {
    expect(isValidDate(new Date())).toBeTruthy();
  });

  it('should validate ISO date string', () => {
    expect(isValidDate('2023-10-15T14:30:00Z')).toBeTruthy();
  });

  it('should reject invalid date string', () => {
    expect(isValidDate('invalid')).toBeFalsy();
  });

  it('should reject null input', () => {
    expect(isValidDate(null as any)).toBeFalsy();
  });

  it('should validate dates within reasonable range', () => {
    expect(isValidDate('1899-12-31')).toBeFalsy(); // Too old
    expect(isValidDate('2200-01-01')).toBeFalsy(); // Too future
    expect(isValidDate('2023-10-15')).toBeTruthy(); // Valid
  });

  it('should handle leap year dates', () => {
    expect(isValidDate('2024-02-29')).toBeTruthy();
    expect(isValidDate('2023-02-29')).toBeFalsy();
  });
});

describe('getDateRange', () => {
  const mockDate = new Date('2023-10-15T14:30:00Z');
  const mockTimezone = 'UTC';

  it('should calculate daily range', () => {
    const range = getDateRange('day', mockDate, mockTimezone);
    expect(range.start.toISOString()).toBe('2023-10-15T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2023-10-15T23:59:59.999Z');
  });

  it('should calculate weekly range', () => {
    const range = getDateRange('week', mockDate, mockTimezone);
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.duration).toBeGreaterThan(0);
  });

  it('should calculate monthly range', () => {
    const range = getDateRange('month', mockDate, mockTimezone);
    expect(range.start.toISOString()).toBe('2023-10-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2023-10-31T23:59:59.999Z');
  });

  it('should throw error for invalid date', () => {
    expect(() => getDateRange('day', 'invalid', mockTimezone)).toThrow('Invalid date provided');
  });
});

describe('formatDuration', () => {
  it('should format duration with long format', () => {
    const duration = 3661000; // 1 hour, 1 minute, 1 second
    expect(formatDuration(duration, 'long')).toBe('1 hours 1 minutes 1 seconds');
  });

  it('should format duration with short format', () => {
    const duration = 3661000;
    expect(formatDuration(duration, 'short')).toBe('1 hrs 1 min 1 sec');
  });

  it('should format duration with narrow format', () => {
    const duration = 3661000;
    expect(formatDuration(duration, 'narrow')).toBe('1h 1m');
  });

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0 seconds');
  });

  it('should throw error for negative duration', () => {
    expect(() => formatDuration(-1000)).toThrow('Duration cannot be negative');
  });

  it('should handle large durations', () => {
    const largeDuration = 90061000; // 25 hours, 1 minute, 1 second
    expect(formatDuration(largeDuration, 'short')).toBe('1 days 1 hrs 1 min 1 sec');
  });
});