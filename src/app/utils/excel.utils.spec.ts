import { describe, expect, it } from 'vitest';
import {
  formatExcelDate,
  parseExcelDate,
  parseExcelImportRows,
  validateExcelNumber,
} from './excel.utils';

const mockTranslate = (key: string): string => {
  const templates: Record<string, string> = {
    'ERROR.IMPORT_EMPTY_FILE': 'File is empty',
    'ERROR.IMPORT_EXCEL_MISSING_DATE_COLUMN': 'Missing date column: {{column}}',
    'ERROR.IMPORT_INVALID_DATE_VALUE': 'Invalid date at row {{row}}: {{value}}',
    'ERROR.IMPORT_DUPLICATE_DATE': 'Duplicate date {{date}} at row {{row}} (first at {{firstRow}})',
    'ERROR.IMPORT_INVALID_NUMBER_VALUE': 'Invalid number at row {{row}} for {{field}}: {{value}}',
  };
  return templates[key] ?? key;
};

describe('excel.utils', () => {
  describe('formatExcelDate', () => {
    it('should format dates with zero-padded month and day as YYYY-MM-DD', () => {
      expect(formatExcelDate(new Date(2025, 0, 5))).toBe('2025-01-05');
      expect(formatExcelDate(new Date(2025, 10, 19))).toBe('2025-11-19');
    });
  });

  describe('parseExcelDate', () => {
    it('should return null for empty, falsy, or unsupported values', () => {
      expect(parseExcelDate(null)).toBeNull();
      expect(parseExcelDate(undefined)).toBeNull();
      expect(parseExcelDate('')).toBeNull();
      expect(parseExcelDate(0)).toBeNull();
      expect(parseExcelDate(true)).toBeNull();
      expect(parseExcelDate({})).toBeNull();
    });

    it('should return the same Date instance when given a Date object', () => {
      const d = new Date(2025, 4, 10);
      expect(parseExcelDate(d)).toBe(d);
    });

    it('should parse valid DD.MM.YYYY and DD/MM/YYYY European dates and reject calendar rollovers', () => {
      const dotDate = parseExcelDate('05.03.2025');
      expect(dotDate).not.toBeNull();
      expect(formatExcelDate(dotDate!)).toBe('2025-03-05');

      const slashDate = parseExcelDate('15/11/2025');
      expect(slashDate).not.toBeNull();
      expect(formatExcelDate(slashDate!)).toBe('2025-11-15');

      expect(parseExcelDate('31.02.2025')).toBeNull();
      expect(parseExcelDate('32/13/2025')).toBeNull();
    });

    it('should parse ISO strings and return null for invalid date strings', () => {
      const iso = parseExcelDate('2025-07-20T00:00:00Z');
      expect(iso).toBeInstanceOf(Date);
      expect(iso?.toISOString().slice(0, 10)).toBe('2025-07-20');

      expect(parseExcelDate('not-a-valid-date')).toBeNull();
    });

    it('should convert numeric Excel serial dates to UTC Date instances', () => {
      // 45658 corresponds to 2025-01-01 in Excel's 1900 date system
      const serialDate = parseExcelDate(45658);
      expect(serialDate?.toISOString().slice(0, 10)).toBe('2025-01-01');
    });
  });

  describe('validateExcelNumber', () => {
    it('should return 0 without errors for null, undefined, or empty string', () => {
      const errors: string[] = [];
      expect(validateExcelNumber(null, 2, 'Value', errors, mockTranslate)).toBe(0);
      expect(validateExcelNumber(undefined, 2, 'Value', errors, mockTranslate)).toBe(0);
      expect(validateExcelNumber('', 2, 'Value', errors, mockTranslate)).toBe(0);
      expect(errors).toEqual([]);
    });

    it('should parse valid numbers and numeric strings', () => {
      const errors: string[] = [];
      expect(validateExcelNumber(123.45, 2, 'Value', errors, mockTranslate)).toBe(123.45);
      expect(validateExcelNumber('67.8', 3, 'Value', errors, mockTranslate)).toBe(67.8);
      expect(errors).toEqual([]);
    });

    it('should record formatted errors and return 0 for non-numeric strings and objects', () => {
      const errors: string[] = [];
      expect(validateExcelNumber('abc', 4, 'kWh', errors, mockTranslate)).toBe(0);
      expect(validateExcelNumber({ raw: 'bad' }, 5, 'kWh', errors, mockTranslate)).toBe(0);

      expect(errors).toEqual([
        'Invalid number at row 4 for kWh: abc',
        'Invalid number at row 5 for kWh: {"raw":"bad"}',
      ]);
    });
  });

  describe('parseExcelImportRows', () => {
    it('should throw when data array is empty', () => {
      expect(() =>
        parseExcelImportRows({
          data: [],
          dateColumn: 'Date',
          expectedColumns: ['Value'],
          translateFn: mockTranslate,
          parseRow: () => ({}),
        }),
      ).toThrow('File is empty');
    });

    it('should throw when the configured date column is missing from the first row', () => {
      expect(() =>
        parseExcelImportRows({
          data: [{ Value: 100 }],
          dateColumn: 'ReadingDate',
          expectedColumns: ['Value'],
          translateFn: mockTranslate,
          parseRow: () => ({}),
        }),
      ).toThrow('Missing date column: ReadingDate');
    });

    it('should parse valid rows and report any missing expected columns', () => {
      const result = parseExcelImportRows({
        data: [
          { Date: '01.01.2025', Warm: 10 },
          { Date: '01.02.2025', Warm: 25 },
        ],
        dateColumn: 'Date',
        expectedColumns: ['Warm', 'Cold'],
        translateFn: mockTranslate,
        parseRow: (row, date, rowNumber, rowErrors) => ({
          date: formatExcelDate(date),
          warm: validateExcelNumber(row['Warm'], rowNumber, 'Warm', rowErrors, mockTranslate),
        }),
      });

      expect(result.missingColumns).toEqual(['Cold']);
      expect(result.records).toEqual([
        { date: '2025-01-01', warm: 10 },
        { date: '2025-02-01', warm: 25 },
      ]);
    });

    it('should aggregate invalid date, duplicate date, and row-level validation errors before throwing', () => {
      expect(() =>
        parseExcelImportRows({
          data: [
            { Date: '01.01.2025', Value: 100 },
            { Date: 'invalid-date', Value: 120 },
            { Date: '01.01.2025', Value: 130 },
            { Date: '01.02.2025', Value: 'not-a-number' },
          ],
          dateColumn: 'Date',
          expectedColumns: ['Value'],
          translateFn: mockTranslate,
          parseRow: (row, date, rowNumber, rowErrors) => ({
            date,
            value: validateExcelNumber(row['Value'], rowNumber, 'Value', rowErrors, mockTranslate),
          }),
        }),
      ).toThrow(
        [
          'Invalid date at row 3: invalid-date',
          'Duplicate date 2025-01-01 at row 4 (first at 2)',
          'Invalid number at row 5 for Value: not-a-number',
        ].join('\n'),
      );
    });
  });
});
