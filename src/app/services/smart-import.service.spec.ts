import { TestBed } from '@angular/core/testing';
import { SmartImportService } from './smart-import.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';

describe('SmartImportService', () => {
  let service: SmartImportService;
  let languageServiceMock: {
    translateForLanguage: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
    currentLang: ReturnType<typeof signal<string>>;
  };

  // Month translations for testing
  const monthTranslations: Record<string, Record<string, string>> = {
    en: {
      'MONTHS.JANUARY': 'january',
      'MONTHS.FEBRUARY': 'february',
      'MONTHS.MARCH': 'march',
      'MONTHS.APRIL': 'april',
      'MONTHS.MAY': 'may',
      'MONTHS.JUNE': 'june',
      'MONTHS.JULY': 'july',
      'MONTHS.AUGUST': 'august',
      'MONTHS.SEPTEMBER': 'september',
      'MONTHS.OCTOBER': 'october',
      'MONTHS.NOVEMBER': 'november',
      'MONTHS.DECEMBER': 'december'
    },
    de: {
      'MONTHS.JANUARY': 'januar',
      'MONTHS.FEBRUARY': 'februar',
      'MONTHS.MARCH': 'märz',
      'MONTHS.APRIL': 'april',
      'MONTHS.MAY': 'mai',
      'MONTHS.JUNE': 'juni',
      'MONTHS.JULY': 'juli',
      'MONTHS.AUGUST': 'august',
      'MONTHS.SEPTEMBER': 'september',
      'MONTHS.OCTOBER': 'oktober',
      'MONTHS.NOVEMBER': 'november',
      'MONTHS.DECEMBER': 'dezember'
    }
  };

  beforeEach(() => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => monthTranslations['en'][key] ?? key),
      translateForLanguage: vi.fn((key: string, lang: string) => {
        return monthTranslations[lang]?.[key] ?? key;
      })
    };

    TestBed.configureTestingModule({
      providers: [
        SmartImportService,
        { provide: LanguageService, useValue: languageServiceMock }
      ]
    });
    service = TestBed.inject(SmartImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================
  // Basic Value Extraction Tests
  // ============================================
  describe('value extraction', () => {
    it('should extract simple integers', () => {
      const result = service.parseRawText('01.01.2023 1234');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should treat dot as thousands separator (1.234 -> 1234)', () => {
      const result = service.parseRawText('01.01.2023 1.234');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should treat comma as thousands separator (1,234 -> 1234)', () => {
      const result = service.parseRawText('01.01.2023 1,234');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should truncate decimal part with German format (1.234,56 -> 1234)', () => {
      const result = service.parseRawText('01.01.2023 1.234,56');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should truncate decimal part with English format (1,234.56 -> 1234)', () => {
      const result = service.parseRawText('01.01.2023 1,234.56');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should handle tabular input with meter number prefix', () => {
      const result = service.parseRawText('1HLY02ABCDEFGH\tET\t01.01.2026\t12,632.00\tZwischenablesung\tabgelesen von Ihnen');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(12632);
    });

    it('should take the last number as value when multiple numbers present', () => {
      const result = service.parseRawText('01.01.2023 Meter: 42 Value: 9999');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(9999);
    });

    it('should strip kWh unit', () => {
      const result = service.parseRawText('01.01.2023 1234 kWh');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should strip m3 unit', () => {
      const result = service.parseRawText('01.01.2023 567 m3');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(567);
    });

    it('should strip L unit', () => {
      const result = service.parseRawText('01.01.2023 890 L');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(890);
    });

    it('should handle very large numbers', () => {
      const result = service.parseRawText('01.01.2023 9999999');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(9999999);
    });

    it('should handle zero value', () => {
      const result = service.parseRawText('01.01.2023 0');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(0);
    });
  });

  // ============================================
  // Date Format: DD.MM.YYYY (European/German)
  // ============================================
  describe('date extraction - DD.MM.YYYY format', () => {
    it('should parse date with leading zeros', () => {
      const result = service.parseRawText('01.01.2023 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getFullYear()).toBe(2023);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(1);
    });

    it('should parse date without leading zeros', () => {
      const result = service.parseRawText('1.1.2023 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getFullYear()).toBe(2023);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(1);
    });

    it('should parse all months correctly', () => {
      for (let month = 1; month <= 12; month++) {
        const result = service.parseRawText(`15.${month.toString().padStart(2, '0')}.2023 100`);
        expect(result.length).toBe(1);
        expect(result[0].date.getMonth()).toBe(month - 1);
      }
    });

    it('should handle end of month dates', () => {
      const result = service.parseRawText('31.12.2023 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getDate()).toBe(31);
      expect(result[0].date.getMonth()).toBe(11);
    });
  });

  // ============================================
  // Date Format: YYYY-MM-DD (ISO)
  // ============================================
  describe('date extraction - ISO format', () => {
    it('should parse ISO date format', () => {
      const result = service.parseRawText('2023-01-15 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getFullYear()).toBe(2023);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(15);
    });

    it('should parse ISO date without leading zeros', () => {
      const result = service.parseRawText('2023-1-5 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(5);
    });
  });

  // ============================================
  // Date Format: Text dates (German)
  // ============================================
  describe('date extraction - German text format', () => {
    it('should parse German text date format (1. Januar 2026)', () => {
      const result = service.parseRawText('1. Januar 2026 12345');
      expect(result.length).toBe(1);
      expect(result[0].date.getFullYear()).toBe(2026);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(1);
      expect(result[0].value).toBe(12345);
    });

    it('should parse German text date with weekday prefix', () => {
      const result = service.parseRawText('Donnerstag, 1. Januar 2026 12345');
      expect(result.length).toBe(1);
      expect(result[0].date.getFullYear()).toBe(2026);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(1);
    });

    it('should parse all German months correctly', () => {
      const germanMonths = [
        { name: 'Januar', index: 0 },
        { name: 'Februar', index: 1 },
        { name: 'März', index: 2 },
        { name: 'April', index: 3 },
        { name: 'Mai', index: 4 },
        { name: 'Juni', index: 5 },
        { name: 'Juli', index: 6 },
        { name: 'August', index: 7 },
        { name: 'September', index: 8 },
        { name: 'Oktober', index: 9 },
        { name: 'November', index: 10 },
        { name: 'Dezember', index: 11 }
      ];

      for (const { name, index } of germanMonths) {
        const result = service.parseRawText(`1. ${name} 2026 100`);
        expect(result.length).toBe(1);
        expect(result[0].date.getMonth()).toBe(index);
      }
    });

    it('should be case insensitive for German month names', () => {
      const result = service.parseRawText('1. JANUAR 2026 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getMonth()).toBe(0);
    });

    it('should handle double-digit day in German format', () => {
      const result = service.parseRawText('15. Dezember 2026 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getDate()).toBe(15);
    });
  });

  // ============================================
  // Date Format: Text dates (English)
  // ============================================
  describe('date extraction - English text format', () => {
    it('should parse English text date format (January 1, 2026)', () => {
      const result = service.parseRawText('January 1, 2026 12345');
      expect(result.length).toBe(1);
      expect(result[0].date.getFullYear()).toBe(2026);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(1);
    });

    it('should parse English text date without comma', () => {
      const result = service.parseRawText('January 1 2026 12345');
      expect(result.length).toBe(1);
      expect(result[0].date.getMonth()).toBe(0);
    });

    it('should parse English text date with weekday prefix', () => {
      const result = service.parseRawText('Thursday, January 1, 2026 12345');
      expect(result.length).toBe(1);
      expect(result[0].date.getFullYear()).toBe(2026);
      expect(result[0].date.getMonth()).toBe(0);
    });

    it('should parse all English months correctly', () => {
      const englishMonths = [
        { name: 'January', index: 0 },
        { name: 'February', index: 1 },
        { name: 'March', index: 2 },
        { name: 'April', index: 3 },
        { name: 'May', index: 4 },
        { name: 'June', index: 5 },
        { name: 'July', index: 6 },
        { name: 'August', index: 7 },
        { name: 'September', index: 8 },
        { name: 'October', index: 9 },
        { name: 'November', index: 10 },
        { name: 'December', index: 11 }
      ];

      for (const { name, index } of englishMonths) {
        const result = service.parseRawText(`${name} 1, 2026 100`);
        expect(result.length).toBe(1);
        expect(result[0].date.getMonth()).toBe(index);
      }
    });

    it('should be case insensitive for English month names', () => {
      const result = service.parseRawText('JANUARY 1, 2026 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getMonth()).toBe(0);
    });
  });

  // ============================================
  // Multi-line Record Parsing
  // ============================================
  describe('multi-line record parsing', () => {
    it('should parse multi-line records with date and value on separate lines', () => {
      const input = `Donnerstag, 1. Januar 2026
Verbrauch: 12632

Montag, 1. Dezember 2025
Verbrauch: 12111

Samstag, 1. November 2025
Verbrauch: 11731`;

      const result = service.parseRawText(input);

      expect(result.length).toBe(3);

      expect(result[0].date.getFullYear()).toBe(2026);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].value).toBe(12632);

      expect(result[1].date.getFullYear()).toBe(2025);
      expect(result[1].date.getMonth()).toBe(11);
      expect(result[1].value).toBe(12111);

      expect(result[2].date.getFullYear()).toBe(2025);
      expect(result[2].date.getMonth()).toBe(10);
      expect(result[2].value).toBe(11731);
    });

    it('should prefer single-line parsing when date and value are on same line', () => {
      const input = '01.01.2026 12345';
      const result = service.parseRawText(input);
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(12345);
    });

    it('should handle mixed single-line and multi-line content', () => {
      const input = `01.01.2026 12345
02.01.2026 12400`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });

    it('should skip orphaned date lines without following value', () => {
      const input = `01.01.2026
Some text without numbers
02.01.2026 12345`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(12345);
    });
  });

  // ============================================
  // Deduplication
  // ============================================
  describe('deduplication', () => {
    it('should deduplicate records with the same date', () => {
      const input = `Donnerstag, 1. Januar 2026
Verbrauch: 12632

Donnerstag, 1. Januar 2026
Verbrauch: 12632

Montag, 1. Dezember 2025
Verbrauch: 12111`;

      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });

    it('should keep first occurrence when duplicates exist', () => {
      const input = `01.01.2026 1000
01.01.2026 2000`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1000);
    });

    it('should not deduplicate different dates', () => {
      const input = `01.01.2026 1000
02.01.2026 1000`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });
  });

  // ============================================
  // Edge Cases and Error Handling
  // ============================================
  describe('edge cases', () => {
    it('should return empty array for empty input', () => {
      const result = service.parseRawText('');
      expect(result.length).toBe(0);
    });

    it('should return empty array for whitespace-only input', () => {
      const result = service.parseRawText('   \n\t  \n   ');
      expect(result.length).toBe(0);
    });

    it('should return empty array for text without valid date/value pairs', () => {
      const result = service.parseRawText('Hello world, this is just text');
      expect(result.length).toBe(0);
    });

    it('should handle Windows line endings (CRLF)', () => {
      const input = '01.01.2026 100\r\n02.01.2026 200';
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });

    it('should handle Unix line endings (LF)', () => {
      const input = '01.01.2026 100\n02.01.2026 200';
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });

    it('should handle lines with only date (no value)', () => {
      const result = service.parseRawText('01.01.2026');
      expect(result.length).toBe(0);
    });

    it('should handle lines with only value (no date)', () => {
      const result = service.parseRawText('12345');
      expect(result.length).toBe(0);
    });

    it('should not confuse year in date as value', () => {
      const result = service.parseRawText('01.01.2026 5000');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(5000);
      expect(result[0].date.getFullYear()).toBe(2026);
    });

    it('should handle date at end of line with value at start', () => {
      const result = service.parseRawText('Value: 1234 Date: 01.01.2026');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should handle multiple spaces between date and value', () => {
      const result = service.parseRawText('01.01.2026     5000');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(5000);
    });

    it('should handle tab separation between date and value', () => {
      const result = service.parseRawText('01.01.2026\t5000');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(5000);
    });

    it('should store original line in parsed record', () => {
      const result = service.parseRawText('01.01.2026 5000');
      expect(result[0].originalLine).toBe('01.01.2026 5000');
    });
  });

  // ============================================
  // Unicode and Special Characters
  // ============================================
  describe('unicode and special characters', () => {
    it('should handle German umlauts in month names (März)', () => {
      const result = service.parseRawText('1. März 2026 100');
      expect(result.length).toBe(1);
      expect(result[0].date.getMonth()).toBe(2);
    });

    it('should handle special characters in surrounding text', () => {
      const result = service.parseRawText('Zählerstand: 01.01.2026 Wert: 1234 €');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });

    it('should handle text with emojis', () => {
      const result = service.parseRawText('📊 01.01.2026 1234 ⚡');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(1234);
    });
  });

  // ============================================
  // Real-world Input Formats
  // ============================================
  describe('real-world input formats', () => {
    it('should parse utility company tabular format', () => {
      const input = `1HLY02ABCDEFGH\tET\t01.01.2026\t12,632.00\tZwischenablesung\tabgelesen von Ihnen
1HLY02ABCDEFGH\tET\t01.12.2025\t12,111.00\tZwischenablesung\tabgelesen von Ihnen`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
      expect(result[0].value).toBe(12632);
      expect(result[1].value).toBe(12111);
    });

    it('should parse CSV-like format', () => {
      const input = `Date,Value
01.01.2026,1234
02.01.2026,1300`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });

    it('should parse report-style format with labels', () => {
      const input = `Report Date: 01.01.2026
Meter Reading: 12345
---
Report Date: 01.12.2025
Meter Reading: 11000`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });

    it('should handle text with header rows (no date/value pairs)', () => {
      const input = `Electricity Consumption Report
==============================
Date             Reading
01.01.2026       1234
02.01.2026       1300`;
      const result = service.parseRawText(input);
      expect(result.length).toBe(2);
    });
  });

  // ============================================
  // Month Translation Integration
  // ============================================
  describe('month translation integration', () => {
    it('should call translateForLanguage for each supported language', () => {
      service.parseRawText('1. Januar 2026 100');
      // Should have been called for both 'en' and 'de' languages
      expect(languageServiceMock.translateForLanguage).toHaveBeenCalled();
    });

    it('should handle missing translations gracefully', () => {
      // Mock translation service to return key for unknown language
      languageServiceMock.translateForLanguage.mockImplementation((key: string) => key);

      // Should still try to parse, just won't match text months
      const result = service.parseRawText('01.01.2026 100');
      expect(result.length).toBe(1);
    });

    it('should cache month maps for performance', () => {
      // Parse multiple records
      service.parseRawText('1. Januar 2026 100');
      service.parseRawText('1. Februar 2026 200');

      // The cache should prevent rebuilding the month map every time
      // Count the number of unique calls per language
      const calls = languageServiceMock.translateForLanguage.mock.calls;
      const deCalls = calls.filter((call: unknown[]) => call[1] === 'de');

      // Should only build the map once per language (12 months)
      // Second parse shouldn't trigger new translation calls
      expect(deCalls.length).toBeLessThanOrEqual(12);
    });
  });
});
