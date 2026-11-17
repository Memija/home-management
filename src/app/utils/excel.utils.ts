const EXCEL_EPOCH = Date.UTC(1900, 0, 1);
const EUROPEAN_DATE_PATTERN = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/;

/**
 * Format date as YYYY-MM-DD string
 */
export function formatExcelDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from various Excel formats (Date instance, DD.MM.YYYY, DD/MM/YYYY, ISO string, or serial number)
 */
export function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const europeanMatch = EUROPEAN_DATE_PATTERN.exec(value);
    if (europeanMatch) {
      const day = Number.parseInt(europeanMatch[1], 10);
      const month = Number.parseInt(europeanMatch[2], 10) - 1;
      const year = Number.parseInt(europeanMatch[3], 10);
      const date = new Date(year, month, day);

      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'number') {
    return new Date(EXCEL_EPOCH + (value - 2) * 24 * 60 * 60 * 1000);
  }

  return null;
}

/**
 * Validate numeric cell value and collect error instead of throwing.
 * Returns 0 for empty/invalid values and pushes translated error message to errors array.
 */
export function validateExcelNumber(
  value: unknown,
  rowIndex: number,
  columnName: string,
  errors: string[],
  translateFn: (key: string) => string,
): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    const displayValue =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
    errors.push(
      translateFn('ERROR.IMPORT_INVALID_NUMBER_VALUE')
        .replace('{{row}}', rowIndex.toString())
        .replace('{{value}}', displayValue)
        .replace('{{field}}', columnName),
    );
    return 0;
  }

  return num;
}

/**
 * Shared Excel import pipeline: validates non-empty data, date column presence,
 * missing optional columns, row dates, duplicate dates, and row-level numeric fields.
 */
export function parseExcelImportRows<T>(params: {
  data: Record<string, unknown>[];
  dateColumn: string;
  expectedColumns: string[];
  translateFn: (key: string) => string;
  parseRow: (row: Record<string, unknown>, date: Date, rowNumber: number, rowErrors: string[]) => T;
}): { records: T[]; missingColumns: string[] } {
  const { data, dateColumn, expectedColumns, translateFn, parseRow } = params;

  if (data.length === 0) {
    throw new Error(translateFn('ERROR.IMPORT_EMPTY_FILE'));
  }

  const firstRow = data[0];
  if (!(dateColumn in firstRow)) {
    throw new Error(
      translateFn('ERROR.IMPORT_EXCEL_MISSING_DATE_COLUMN').replace('{{column}}', dateColumn),
    );
  }

  const missingColumns = expectedColumns.filter((col) => !(col in firstRow));
  const records: T[] = [];
  const validationErrors: string[] = [];
  const seenDates = new Map<string, number>();

  for (let index = 0; index < data.length; index++) {
    const row = data[index];
    const rowNumber = index + 2;
    const dateValue = row[dateColumn];
    const date = parseExcelDate(dateValue);

    if (!date) {
      validationErrors.push(
        translateFn('ERROR.IMPORT_INVALID_DATE_VALUE')
          .replace('{{row}}', rowNumber.toString())
          .replace('{{value}}', String(dateValue)),
      );
      continue;
    }

    const dateKey = formatExcelDate(date);
    if (seenDates.has(dateKey)) {
      validationErrors.push(
        translateFn('ERROR.IMPORT_DUPLICATE_DATE')
          .replace('{{row}}', rowNumber.toString())
          .replace('{{date}}', dateKey)
          .replace('{{firstRow}}', seenDates.get(dateKey)!.toString()),
      );
      continue;
    }
    seenDates.set(dateKey, rowNumber);

    const rowErrors: string[] = [];
    const record = parseRow(row, date, rowNumber, rowErrors);

    if (rowErrors.length > 0) {
      validationErrors.push(...rowErrors);
      continue;
    }

    records.push(record);
  }

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  return { records, missingColumns };
}
