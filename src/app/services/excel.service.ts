import { Injectable, inject } from '@angular/core';
import { ExcelSettingsService, WaterColumnMapping, HeatingColumnMapping } from './excel-settings.service';
import { LanguageService } from './language.service';
import { WaterRecord, DynamicHeatingRecord, ElectricityRecord } from '../models/records.model';

// Re-export for consumers
export type { WaterRecord, DynamicHeatingRecord, ElectricityRecord } from '../models/records.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  private excelSettings = inject(ExcelSettingsService);
  private languageService = inject(LanguageService);
  private xlsxModule: typeof import('xlsx') | null = null;

  /**
   * Dynamically load xlsx library when needed
   */
  private async getXLSX(): Promise<typeof import('xlsx')> {
    if (!this.xlsxModule) {
      this.xlsxModule = await import('xlsx');
    }
    return this.xlsxModule;
  }

  /**
   * Export water consumption records to Excel
   */
  async exportWaterToExcel(records: WaterRecord[], filename: string = 'water-consumption.xlsx'): Promise<void> {
    const mapping = this.excelSettings.getWaterMapping();

    // Transform records to match column mapping
    const data: Record<string, string | number>[] = records.map(record => ({
      [mapping.date]: this.formatDate(record.date),
      [mapping.kitchenWarm]: record.kitchenWarm,
      [mapping.kitchenCold]: record.kitchenCold,
      [mapping.bathroomWarm]: record.bathroomWarm,
      [mapping.bathroomCold]: record.bathroomCold
    }));

    await this.createAndDownloadExcel(data, filename);
  }

  /**
   * Export heating consumption records to Excel
   * Uses dynamic room columns based on room configuration
   */
  async exportHeatingToExcel(records: DynamicHeatingRecord[], filename: string = 'heating-consumption.xlsx'): Promise<void> {
    const mapping = this.excelSettings.getHeatingMapping();
    const roomIds = Object.keys(mapping.rooms);

    // Transform records to match column mapping
    const data: Record<string, string | number>[] = records.map(record => {
      const row: Record<string, string | number> = {
        [mapping.date]: this.formatDate(record.date)
      };

      // Add room columns - map room IDs to their configured column names
      roomIds.forEach(roomId => {
        row[mapping.rooms[roomId]] = record.rooms[roomId] ?? 0;
      });

      return row;
    });

    await this.createAndDownloadExcel(data, filename);
  }

  /**
   * Import water consumption records from Excel
   */
  async importWaterFromExcel(file: File): Promise<{ records: WaterRecord[], missingColumns: string[] }> {
    const mapping = this.excelSettings.getWaterMapping();
    const data = await this.readExcelFile(file);

    if (data.length === 0) {
      throw new Error(this.languageService.translate('ERROR.IMPORT_EMPTY_FILE'));
    }

    // Check that Date column exists in the first row
    const firstRow = data[0];
    if (!(mapping.date in firstRow)) {
      throw new Error(this.languageService.translate('ERROR.IMPORT_EXCEL_MISSING_DATE_COLUMN').replace('{{column}}', mapping.date));
    }

    // Check for other partial columns
    const otherColumns = [mapping.kitchenWarm, mapping.kitchenCold, mapping.bathroomWarm, mapping.bathroomCold];
    const missingColumns = otherColumns.filter(col => !(col in firstRow));

    const records: WaterRecord[] = [];
    const validationErrors: string[] = [];
    const seenDates = new Map<string, number>(); // date string -> first row number

    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const rowNumber = index + 2; // Excel row number (1-indexed + header row)
      const dateValue = row[mapping.date];
      const date = this.parseDate(dateValue);

      if (!date) {
        validationErrors.push(
          this.languageService.translate('ERROR.IMPORT_INVALID_DATE_VALUE')
            .replace('{{row}}', rowNumber.toString())
            .replace('{{value}}', String(dateValue))
        );
        continue; // Skip this row but continue checking others
      }

      // Check for duplicate dates (use local date to match display)
      const dateKey = this.formatDate(date);
      if (seenDates.has(dateKey)) {
        validationErrors.push(
          this.languageService.translate('ERROR.IMPORT_DUPLICATE_DATE')
            .replace('{{row}}', rowNumber.toString())
            .replace('{{date}}', dateKey)
            .replace('{{firstRow}}', seenDates.get(dateKey)!.toString())
        );
        continue; // Skip duplicate
      }
      seenDates.set(dateKey, rowNumber);

      // Collect number validation errors for this row
      const rowErrors: string[] = [];
      const kitchenWarm = this.validateNumberCollectError(row[mapping.kitchenWarm], rowNumber, mapping.kitchenWarm, rowErrors);
      const kitchenCold = this.validateNumberCollectError(row[mapping.kitchenCold], rowNumber, mapping.kitchenCold, rowErrors);
      const bathroomWarm = this.validateNumberCollectError(row[mapping.bathroomWarm], rowNumber, mapping.bathroomWarm, rowErrors);
      const bathroomCold = this.validateNumberCollectError(row[mapping.bathroomCold], rowNumber, mapping.bathroomCold, rowErrors);

      if (rowErrors.length > 0) {
        validationErrors.push(...rowErrors);
        continue; // Skip this row
      }

      records.push({
        date,
        kitchenWarm,
        kitchenCold,
        bathroomWarm,
        bathroomCold
      });
    }

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('\n'));
    }

    return { records, missingColumns };
  }

  /**
   * Import heating consumption records from Excel
   * Uses dynamic room columns based on room configuration
   */
  async importHeatingFromExcel(file: File): Promise<{ records: DynamicHeatingRecord[], missingColumns: string[] }> {
    const mapping = this.excelSettings.getHeatingMapping();
    const data = await this.readExcelFile(file);

    if (data.length === 0) {
      throw new Error(this.languageService.translate('ERROR.IMPORT_EMPTY_FILE'));
    }

    // Check that Date column exists in the first row
    const firstRow = data[0];
    if (!(mapping.date in firstRow)) {
      throw new Error(this.languageService.translate('ERROR.IMPORT_EXCEL_MISSING_DATE_COLUMN').replace('{{column}}', mapping.date));
    }

    // Check for room columns - use dynamic mapping
    const roomIds = Object.keys(mapping.rooms);
    const roomColumnNames = roomIds.map(id => mapping.rooms[id]);
    const missingColumns = roomColumnNames.filter(col => !(col in firstRow));

    const records: DynamicHeatingRecord[] = [];
    const validationErrors: string[] = [];
    const seenDates = new Map<string, number>(); // date string -> first row number

    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const rowNumber = index + 2; // Excel row number (1-indexed + header row)
      const dateValue = row[mapping.date];
      const date = this.parseDate(dateValue);

      if (!date) {
        validationErrors.push(
          this.languageService.translate('ERROR.IMPORT_INVALID_DATE_VALUE')
            .replace('{{row}}', rowNumber.toString())
            .replace('{{value}}', String(dateValue))
        );
        continue; // Skip this row but continue checking others
      }

      // Check for duplicate dates (use local date to match display)
      const dateKey = this.formatDate(date);
      if (seenDates.has(dateKey)) {
        validationErrors.push(
          this.languageService.translate('ERROR.IMPORT_DUPLICATE_DATE')
            .replace('{{row}}', rowNumber.toString())
            .replace('{{date}}', dateKey)
            .replace('{{firstRow}}', seenDates.get(dateKey)!.toString())
        );
        continue; // Skip duplicate
      }
      seenDates.set(dateKey, rowNumber);

      // Collect number validation errors for this row - parse dynamic room columns
      const rowErrors: string[] = [];
      const roomValues: Record<string, number> = {};

      roomIds.forEach(roomId => {
        const columnName = mapping.rooms[roomId];
        roomValues[roomId] = this.validateNumberCollectError(row[columnName], rowNumber, columnName, rowErrors);
      });

      if (rowErrors.length > 0) {
        validationErrors.push(...rowErrors);
        continue; // Skip this row
      }

      records.push({
        date,
        rooms: roomValues
      });
    }

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('\n'));
    }

    return { records, missingColumns };
  }

  /**
   * Create Excel file and trigger download
   */
  private async createAndDownloadExcel(data: unknown[], filename: string): Promise<void> {
    const XLSX = await this.getXLSX();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Generate Excel file and download
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Read Excel file and return data as array of objects
   * Reads all sheets and combines their data
   */
  private async readExcelFile(file: File): Promise<Record<string, unknown>[]> {
    const XLSX = await this.getXLSX();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          // Combine data from all sheets
          const allData: Record<string, unknown>[] = [];

          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];
            allData.push(...sheetData);
          }

          resolve(allData);
        } catch (error) {
          reject(new Error('Failed to parse Excel file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsBinaryString(file);
    });
  }

  /**
   * Format date as YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
 * Parse date from various formats
 */
  private parseDate(value: unknown): Date | null {
    if (!value) return null;

    // If already a Date object
    if (value instanceof Date) {
      return value;
    }

    // If it's a string
    if (typeof value === 'string') {
      // Try DD.MM.YYYY or DD/MM/YYYY format (European)
      const europeanPattern = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/;
      const europeanMatch = value.match(europeanPattern);
      if (europeanMatch) {
        const day = parseInt(europeanMatch[1], 10);
        const month = parseInt(europeanMatch[2], 10) - 1; // Month is 0-indexed
        const year = parseInt(europeanMatch[3], 10);
        const date = new Date(year, month, day);

        // Validate the date
        if (date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day) {
          return date;
        }
        return null; // Invalid date
      }

      // Try standard ISO format or other parseable formats
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // If it's an Excel serial date number
    if (typeof value === 'number') {
      // Excel date serial numbers start from 1900-01-01
      // Use UTC to avoid timezone issues
      const excelEpoch = Date.UTC(1900, 0, 1);
      const date = new Date(excelEpoch + (value - 2) * 24 * 60 * 60 * 1000);
      return date;
    }

    return null;
  }

  /**
   * Validate number and collect error instead of throwing
   * Returns 0 for empty/invalid values, pushes error message to errors array
   */
  private validateNumberCollectError(value: unknown, rowIndex: number, columnName: string, errors: string[]): number {
    if (value === null || value === undefined || value === '') {
      return 0; // Default to 0 for missing/empty values (partial import)
    }

    // Convert to number
    const num = Number(value);

    // strict check
    if (isNaN(num)) {
      errors.push(
        this.languageService.translate('ERROR.IMPORT_INVALID_NUMBER_VALUE')
          .replace('{{row}}', rowIndex.toString())
          .replace('{{value}}', String(value))
          .replace('{{field}}', columnName)
      );
      return 0; // Return 0 as fallback, row will be skipped anyway
    }

    return num;
  }

  /**
   * Export electricity consumption records to Excel
   */
  async exportElectricityToExcel(records: ElectricityRecord[], filename: string = 'electricity-consumption.xlsx'): Promise<void> {
    const mapping = this.excelSettings.getElectricityMapping();

    // Transform records to match column mapping
    const data: Record<string, string | number>[] = records.map(record => ({
      [mapping.date]: this.formatDate(record.date),
      [mapping.value]: Math.round(record.value)
    }));

    await this.createAndDownloadExcel(data, filename);
  }

  /**
   * Import electricity consumption records from Excel
   */
  async importElectricityFromExcel(file: File): Promise<{ records: ElectricityRecord[], missingColumns: string[] }> {
    const mapping = this.excelSettings.getElectricityMapping();
    const data = await this.readExcelFile(file);

    if (data.length === 0) {
      throw new Error(this.languageService.translate('ERROR.IMPORT_EMPTY_FILE'));
    }

    // Check that Date column exists in the first row
    const firstRow = data[0];
    if (!(mapping.date in firstRow)) {
      throw new Error(this.languageService.translate('ERROR.IMPORT_EXCEL_MISSING_DATE_COLUMN').replace('{{column}}', mapping.date));
    }

    // Check for value column
    const missingColumns = [];
    if (!(mapping.value in firstRow)) missingColumns.push(mapping.value);

    const records: ElectricityRecord[] = [];
    const validationErrors: string[] = [];
    const seenDates = new Map<string, number>();

    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const rowNumber = index + 2;
      const dateValue = row[mapping.date];
      const date = this.parseDate(dateValue);

      if (!date) {
        validationErrors.push(
          this.languageService.translate('ERROR.IMPORT_INVALID_DATE_VALUE')
            .replace('{{row}}', rowNumber.toString())
            .replace('{{value}}', String(dateValue))
        );
        continue;
      }

      const dateKey = this.formatDate(date);
      if (seenDates.has(dateKey)) {
        validationErrors.push(
          this.languageService.translate('ERROR.IMPORT_DUPLICATE_DATE')
            .replace('{{row}}', rowNumber.toString())
            .replace('{{date}}', dateKey)
            .replace('{{firstRow}}', seenDates.get(dateKey)!.toString())
        );
        continue;
      }
      seenDates.set(dateKey, rowNumber);

      const rowErrors: string[] = [];
      const value = this.validateNumberCollectError(row[mapping.value], rowNumber, mapping.value, rowErrors);

      if (rowErrors.length > 0) {
        validationErrors.push(...rowErrors);
        continue;
      }

      records.push({ date, value });
    }

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('\n'));
    }

    return { records, missingColumns };
  }
}
