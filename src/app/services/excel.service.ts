import { Injectable, inject } from '@angular/core';
import { ExcelSettingsService, WaterColumnMapping, HeatingColumnMapping } from './excel-settings.service';

export interface WaterRecord {
  date: Date;
  kitchenWarm: number;
  kitchenCold: number;
  bathroomWarm: number;
  bathroomCold: number;
}

export interface HeatingRecord {
  date: Date;
  livingRoom: number;
  bedroom: number;
  kitchen: number;
  bathroom: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  private excelSettings = inject(ExcelSettingsService);
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
    const data = records.map(record => ({
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
   */
  async exportHeatingToExcel(records: HeatingRecord[], filename: string = 'heating-consumption.xlsx'): Promise<void> {
    const mapping = this.excelSettings.getHeatingMapping();

    // Transform records to match column mapping
    const data = records.map(record => ({
      [mapping.date]: this.formatDate(record.date),
      [mapping.livingRoom]: record.livingRoom,
      [mapping.bedroom]: record.bedroom,
      [mapping.kitchen]: record.kitchen,
      [mapping.bathroom]: record.bathroom
    }));

    await this.createAndDownloadExcel(data, filename);
  }

  /**
   * Import water consumption records from Excel
   */
  async importWaterFromExcel(file: File): Promise<WaterRecord[]> {
    const mapping = this.excelSettings.getWaterMapping();
    const data = await this.readExcelFile(file);

    return data.map(row => {
      const dateValue = row[mapping.date];
      const date = this.parseDate(dateValue);

      if (!date) {
        throw new Error(`Invalid date value: ${dateValue}`);
      }

      return {
        date,
        kitchenWarm: this.parseNumber(row[mapping.kitchenWarm]) || 0,
        kitchenCold: this.parseNumber(row[mapping.kitchenCold]) || 0,
        bathroomWarm: this.parseNumber(row[mapping.bathroomWarm]) || 0,
        bathroomCold: this.parseNumber(row[mapping.bathroomCold]) || 0
      };
    });
  }

  /**
   * Import heating consumption records from Excel
   */
  async importHeatingFromExcel(file: File): Promise<HeatingRecord[]> {
    const mapping = this.excelSettings.getHeatingMapping();
    const data = await this.readExcelFile(file);

    return data.map(row => {
      const dateValue = row[mapping.date];
      const date = this.parseDate(dateValue);

      if (!date) {
        throw new Error(`Invalid date value: ${dateValue}`);
      }

      return {
        date,
        livingRoom: this.parseNumber(row[mapping.livingRoom]) || 0,
        bedroom: this.parseNumber(row[mapping.bedroom]) || 0,
        kitchen: this.parseNumber(row[mapping.kitchen]) || 0,
        bathroom: this.parseNumber(row[mapping.bathroom]) || 0
      };
    });
  }

  /**
   * Create Excel file and trigger download
   */
  private async createAndDownloadExcel(data: any[], filename: string): Promise<void> {
    const XLSX = await this.getXLSX();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Generate Excel file and download
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Read Excel file and return data as array of objects
   */
  private async readExcelFile(file: File): Promise<any[]> {
    const XLSX = await this.getXLSX();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
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
  private parseDate(value: any): Date | null {
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
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      return date;
    }

    return null;
  }

  /**
   * Parse number from various formats
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = Number(value);
    return isNaN(num) ? null : num;
  }
}
