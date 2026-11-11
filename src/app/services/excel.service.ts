import { Injectable, inject } from '@angular/core';
import { ExcelSettingsService } from './excel-settings.service';
import { LanguageService } from './language.service';
import { WaterRecord, DynamicHeatingRecord, ElectricityRecord } from '../models/records.model';
import { FILE_SECURITY_LIMITS, validateFileSize } from '../utils/file-security.utils';
import {
  formatExcelDate,
  parseExcelDate,
  validateExcelNumber,
  parseExcelImportRows,
} from '../utils/excel.utils';

// Re-export for consumers
export type { WaterRecord, DynamicHeatingRecord, ElectricityRecord } from '../models/records.model';

@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  private readonly excelSettings = inject(ExcelSettingsService);
  private readonly languageService = inject(LanguageService);
  private xlsxModule: typeof import('xlsx') | null = null;

  /**
   * Dynamically load xlsx library when needed
   */
  private async getXLSX(): Promise<typeof import('xlsx')> {
    this.xlsxModule ??= await import('xlsx');
    return this.xlsxModule;
  }

  /**
   * Export water consumption records to Excel
   */
  async exportWaterToExcel(
    records: WaterRecord[],
    filename = 'water-consumption.xlsx',
  ): Promise<void> {
    const mapping = this.excelSettings.getWaterMapping();

    const data: Record<string, string | number>[] = records.map((record) => ({
      [mapping.date]: formatExcelDate(record.date),
      [mapping.kitchenWarm]: record.kitchenWarm,
      [mapping.kitchenCold]: record.kitchenCold,
      [mapping.bathroomWarm]: record.bathroomWarm,
      [mapping.bathroomCold]: record.bathroomCold,
    }));

    await this.createAndDownloadExcel(data, filename);
  }

  /**
   * Export heating consumption records to Excel
   * Uses dynamic room columns based on room configuration
   */
  async exportHeatingToExcel(
    records: DynamicHeatingRecord[],
    filename = 'heating-consumption.xlsx',
  ): Promise<void> {
    const mapping = this.excelSettings.getHeatingMapping();
    const roomIds = Object.keys(mapping.rooms);

    const data: Record<string, string | number>[] = records.map((record) => {
      const row: Record<string, string | number> = {
        [mapping.date]: formatExcelDate(record.date),
      };

      roomIds.forEach((roomId) => {
        row[mapping.rooms[roomId]] = record.rooms[roomId] ?? 0;
      });

      return row;
    });

    await this.createAndDownloadExcel(data, filename);
  }

  /**
   * Import water consumption records from Excel
   */
  async importWaterFromExcel(
    file: File,
  ): Promise<{ records: WaterRecord[]; missingColumns: string[] }> {
    const mapping = this.excelSettings.getWaterMapping();
    const data = await this.readExcelFile(file);
    const translateFn = (key: string) => this.languageService.translate(key);

    return parseExcelImportRows<WaterRecord>({
      data,
      dateColumn: mapping.date,
      expectedColumns: [
        mapping.kitchenWarm,
        mapping.kitchenCold,
        mapping.bathroomWarm,
        mapping.bathroomCold,
      ],
      translateFn,
      parseRow: (row, date, rowNumber, rowErrors) => ({
        date,
        kitchenWarm: validateExcelNumber(
          row[mapping.kitchenWarm],
          rowNumber,
          mapping.kitchenWarm,
          rowErrors,
          translateFn,
        ),
        kitchenCold: validateExcelNumber(
          row[mapping.kitchenCold],
          rowNumber,
          mapping.kitchenCold,
          rowErrors,
          translateFn,
        ),
        bathroomWarm: validateExcelNumber(
          row[mapping.bathroomWarm],
          rowNumber,
          mapping.bathroomWarm,
          rowErrors,
          translateFn,
        ),
        bathroomCold: validateExcelNumber(
          row[mapping.bathroomCold],
          rowNumber,
          mapping.bathroomCold,
          rowErrors,
          translateFn,
        ),
      }),
    });
  }

  /**
   * Import heating consumption records from Excel
   * Uses dynamic room columns based on room configuration
   */
  async importHeatingFromExcel(
    file: File,
  ): Promise<{ records: DynamicHeatingRecord[]; missingColumns: string[] }> {
    const mapping = this.excelSettings.getHeatingMapping();
    const data = await this.readExcelFile(file);
    const roomIds = Object.keys(mapping.rooms);
    const translateFn = (key: string) => this.languageService.translate(key);

    return parseExcelImportRows<DynamicHeatingRecord>({
      data,
      dateColumn: mapping.date,
      expectedColumns: roomIds.map((id) => mapping.rooms[id]),
      translateFn,
      parseRow: (row, date, rowNumber, rowErrors) => {
        const rooms: Record<string, number> = {};
        roomIds.forEach((roomId) => {
          const columnName = mapping.rooms[roomId];
          rooms[roomId] = validateExcelNumber(
            row[columnName],
            rowNumber,
            columnName,
            rowErrors,
            translateFn,
          );
        });
        return { date, rooms };
      },
    });
  }

  /**
   * Export electricity consumption records to Excel
   */
  async exportElectricityToExcel(
    records: ElectricityRecord[],
    filename = 'electricity-consumption.xlsx',
  ): Promise<void> {
    const mapping = this.excelSettings.getElectricityMapping();

    const data: Record<string, string | number>[] = records.map((record) => ({
      [mapping.date]: formatExcelDate(record.date),
      [mapping.value]: Math.round(record.value),
    }));

    await this.createAndDownloadExcel(data, filename);
  }

  /**
   * Import electricity consumption records from Excel
   */
  async importElectricityFromExcel(
    file: File,
  ): Promise<{ records: ElectricityRecord[]; missingColumns: string[] }> {
    const mapping = this.excelSettings.getElectricityMapping();
    const data = await this.readExcelFile(file);
    const translateFn = (key: string) => this.languageService.translate(key);

    return parseExcelImportRows<ElectricityRecord>({
      data,
      dateColumn: mapping.date,
      expectedColumns: [mapping.value],
      translateFn,
      parseRow: (row, date, rowNumber, rowErrors) => ({
        date,
        value: validateExcelNumber(
          row[mapping.value],
          rowNumber,
          mapping.value,
          rowErrors,
          translateFn,
        ),
      }),
    });
  }

  /**
   * Create Excel file and trigger download
   */
  private async createAndDownloadExcel(data: unknown[], filename: string): Promise<void> {
    const XLSX = await this.getXLSX();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Read Excel file and return data as array of objects
   */
  private async readExcelFile(file: File): Promise<Record<string, unknown>[]> {
    if (!validateFileSize(file, FILE_SECURITY_LIMITS.MAX_EXCEL_FILE_SIZE_BYTES)) {
      throw new Error('File exceeds maximum allowed size (15 MB)');
    }

    const XLSX = await this.getXLSX();

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const allData: Record<string, unknown>[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<
          string,
          unknown
        >[];
        allData.push(...sheetData);
      }

      return allData;
    } catch {
      throw new Error('Failed to parse Excel file');
    }
  }

  private parseDate(value: unknown): Date | null {
    return parseExcelDate(value);
  }
}
