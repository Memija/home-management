import { inject, Injectable } from '@angular/core';
import { LanguageService, Language, SUPPORTED_LANGUAGES } from './language.service';

export interface ParsedRecord {
  date: Date;
  value: number;
  originalLine: string;
}

// Month keys in the translation files (MONTHS.JANUARY, MONTHS.FEBRUARY, etc.)
const MONTH_KEYS = [
  'MONTHS.JANUARY',
  'MONTHS.FEBRUARY',
  'MONTHS.MARCH',
  'MONTHS.APRIL',
  'MONTHS.MAY',
  'MONTHS.JUNE',
  'MONTHS.JULY',
  'MONTHS.AUGUST',
  'MONTHS.SEPTEMBER',
  'MONTHS.OCTOBER',
  'MONTHS.NOVEMBER',
  'MONTHS.DECEMBER'
];

@Injectable({
  providedIn: 'root'
})
export class SmartImportService {
  private languageService = inject(LanguageService);

  // Cache for month-to-index maps per language
  private monthMapsCache: Map<string, Map<string, number>> = new Map();

  constructor() { }

  /**
   * Parses raw text to extract date and value pairs.
   * Supports both single-line records and multi-line records where
   * date and value appear on separate lines.
   */
  parseRawText(text: string): ParsedRecord[] {
    const lines = text.split(/\r?\n/);
    let records: ParsedRecord[] = [];

    // First pass: try single-line parsing (date + value on same line)
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const date = this.extractDate(trimmedLine);
      const value = this.extractValue(trimmedLine);

      if (date && value !== null) {
        records.push({
          date: date,
          value: value,
          originalLine: trimmedLine
        });
      }
    }

    // If no records found, try multi-line parsing
    if (records.length === 0) {
      records = this.parseMultiLineRecords(lines);
    }

    // Deduplicate records by date (keep only the first occurrence for each date)
    return this.deduplicateByDate(records);
  }

  /**
   * Removes duplicate records that have the same date.
   * Keeps the first occurrence for each unique date.
   */
  private deduplicateByDate(records: ParsedRecord[]): ParsedRecord[] {
    const seen = new Map<string, ParsedRecord>();

    for (const record of records) {
      // Create a date key in YYYY-MM-DD format for comparison
      const dateKey = record.date.toISOString().split('T')[0];

      if (!seen.has(dateKey)) {
        seen.set(dateKey, record);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Parses multi-line records where date and value are on separate lines.
   * Looks for a date line followed by a value line.
   */
  private parseMultiLineRecords(lines: string[]): ParsedRecord[] {
    const records: ParsedRecord[] = [];
    let pendingDate: Date | null = null;
    let pendingDateLine: string = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const date = this.extractDate(trimmedLine);
      const value = this.extractValue(trimmedLine);

      if (date) {
        // Found a date line - store it
        pendingDate = date;
        pendingDateLine = trimmedLine;
      } else if (pendingDate && value !== null) {
        // Found a value line after a date line
        records.push({
          date: pendingDate,
          value: value,
          originalLine: `${pendingDateLine} | ${trimmedLine}`
        });
        pendingDate = null;
        pendingDateLine = '';
      }
    }

    return records;
  }

  private extractDate(line: string): Date | null {
    // Regex for DD.MM.YYYY (German/European)
    const deDateRegex = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
    const deMatch = line.match(deDateRegex);
    if (deMatch) {
      const day = parseInt(deMatch[1], 10);
      const month = parseInt(deMatch[2], 10) - 1; // Months are 0-indexed
      const year = parseInt(deMatch[3], 10);
      return new Date(year, month, day);
    }

    // Regex for YYYY-MM-DD (ISO)
    const isoDateRegex = /(\d{4})-(\d{1,2})-(\d{1,2})/;
    const isoMatch = line.match(isoDateRegex);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      return new Date(year, month, day);
    }

    // Regex for text format: "1. Januar 2026" or "Donnerstag, 1. Januar 2026"
    // Uses \p{L} to match any Unicode letter (works for German, French, Spanish, etc.)
    const textDateDayFirstRegex = /(?:\p{L}+,?\s+)?(\d{1,2})\.\s*(\p{L}+)\s+(\d{4})/iu;
    const dayFirstMatch = line.match(textDateDayFirstRegex);
    if (dayFirstMatch) {
      const day = parseInt(dayFirstMatch[1], 10);
      const monthName = dayFirstMatch[2].toLowerCase();
      const year = parseInt(dayFirstMatch[3], 10);

      const monthIndex = this.getMonthIndex(monthName);
      if (monthIndex !== undefined) {
        return new Date(year, monthIndex, day);
      }
    }

    // Regex for text format: "January 1, 2026" or "Thursday, January 1, 2026"
    // Uses \p{L} to match any Unicode letter (works for any language)
    const textDateMonthFirstRegex = /(?:\p{L}+,?\s+)?(\p{L}+)\s+(\d{1,2}),?\s+(\d{4})/iu;
    const monthFirstMatch = line.match(textDateMonthFirstRegex);
    if (monthFirstMatch) {
      const monthName = monthFirstMatch[1].toLowerCase();
      const day = parseInt(monthFirstMatch[2], 10);
      const year = parseInt(monthFirstMatch[3], 10);

      const monthIndex = this.getMonthIndex(monthName);
      if (monthIndex !== undefined) {
        return new Date(year, monthIndex, day);
      }
    }

    return null;
  }

  /**
   * Gets the month index (0-11) from a month name.
   * Dynamically searches all supported languages using translations.
   * To add a new language, add translations for MONTHS.* keys and update SUPPORTED_LANGUAGES.
   */
  private getMonthIndex(monthName: string): number | undefined {
    const normalizedName = monthName.toLowerCase();

    // Check all supported languages
    for (const lang of SUPPORTED_LANGUAGES) {
      const monthMap = this.getMonthMapForLanguage(lang);
      const index = monthMap.get(normalizedName);
      if (index !== undefined) {
        return index;
      }
    }
    return undefined;
  }

  /**
   * Gets or builds the month-to-index map for a specific language.
   * Uses caching to avoid rebuilding on every call.
   */
  private getMonthMapForLanguage(lang: Language): Map<string, number> {
    // Check cache first
    if (this.monthMapsCache.has(lang)) {
      return this.monthMapsCache.get(lang)!;
    }

    // Build month map from translations
    const monthMap = new Map<string, number>();
    MONTH_KEYS.forEach((key, index) => {
      const monthName = this.languageService.translateForLanguage(key, lang);
      if (monthName && monthName !== key) {
        monthMap.set(monthName.toLowerCase(), index);
      }
    });

    // Cache the result
    this.monthMapsCache.set(lang, monthMap);
    return monthMap;
  }

  private extractValue(line: string): number | null {
    // Remove common units and other noise to isolate the number
    const cleanLine = line.replace(/kWh|m3|L/gi, '').trim();

    // Remove date-like patterns from string to avoid false positives (like year 2024 or day/month)
    let lineWithoutDate = cleanLine
      .replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/, '')  // DD.MM.YYYY
      .replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, '');    // YYYY-MM-DD

    // Remove text date patterns (works for any language with Unicode \p{L})
    // Pattern 1: Day first - "1. Januar 2026", "Donnerstag, 1. Januar 2026", "1 janvier 2026"
    lineWithoutDate = lineWithoutDate.replace(/(?:\p{L}+,?\s+)?\d{1,2}\.?\s*\p{L}+\s+\d{4}/giu, '');
    // Pattern 2: Month first - "January 1, 2026", "Thursday, January 1, 2026"
    lineWithoutDate = lineWithoutDate.replace(/(?:\p{L}+,?\s+)?\p{L}+\s+\d{1,2},?\s+\d{4}/giu, '');

    // Find ALL sequences of digits that may contain . or ,
    // We match any sequence starting with a digit, containing digits, dots, or commas
    // Use global flag to find all matches, then take the LAST one (typically the value in tabular data)
    const numberMatches = lineWithoutDate.match(/[0-9][0-9.,]*/g);

    if (numberMatches && numberMatches.length > 0) {
      // Take the last match - in tabular data, the value is usually the last number
      let rawNumberString = numberMatches[numberMatches.length - 1];

      // Heuristic for "Whole Numbers Only" from formatted strings:
      // If the string contains BOTH . and , (e.g. 12,632.00 or 1.234,56)
      // The LAST separator is almost certainly the decimal separator.
      // We should truncate everything after it to get the integer part.
      if (rawNumberString.includes('.') && rawNumberString.includes(',')) {
        const lastDotIndex = rawNumberString.lastIndexOf('.');
        const lastCommaIndex = rawNumberString.lastIndexOf(',');
        const cutIndex = Math.max(lastDotIndex, lastCommaIndex);

        rawNumberString = rawNumberString.substring(0, cutIndex);
      } else if (rawNumberString.includes('.') || rawNumberString.includes(',')) {
        // Single separator case
        // e.g. 12.00 vs 1.234
        // e.g. 12,00 vs 1,234

        const separator = rawNumberString.includes('.') ? '.' : ',';
        const parts = rawNumberString.split(separator);
        const lastPart = parts[parts.length - 1];

        // If the part after the last separator has exactly 2 digits, assume it's cents/decimals -> Truncate.
        // If it has 1 digit, assume decimal -> Truncate.
        // If it has >= 3 digits, assume thousands -> Keep (e.g. 1.234).
        // Example: 1.234 -> 1234
        // Example: 1.23 -> 1
        if (lastPart.length < 3) {
          const lastSeparatorIndex = rawNumberString.lastIndexOf(separator);
          rawNumberString = rawNumberString.substring(0, lastSeparatorIndex);
        }
      }

      // Strict rule: "do not include . or ," -> Strip them out completely
      const strippedString = rawNumberString.replace(/[.,]/g, '');

      // Parse as integer
      const value = parseInt(strippedString, 10);

      if (!isNaN(value)) {
        return value;
      }
    }

    return null;
  }
}
