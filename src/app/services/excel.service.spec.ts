import { TestBed } from '@angular/core/testing';
import { ExcelService } from './excel.service';
import { ExcelSettingsService } from './excel-settings.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ExcelService', () => {
  let service: ExcelService;
  let mockExcelSettingsService: any;
  let mockXLSX: any;

  beforeEach(() => {
    mockExcelSettingsService = {
      getWaterMapping: vi.fn().mockReturnValue({
        date: 'Date',
        kitchenWarm: 'Kitchen Warm',
        kitchenCold: 'Kitchen Cold',
        bathroomWarm: 'Bathroom Warm',
        bathroomCold: 'Bathroom Cold',
      }),
      getHeatingMapping: vi.fn().mockReturnValue({
        date: 'Date',
        rooms: {
          livingRoom: 'Living Room',
          bedroom: 'Bedroom',
          kitchen: 'Kitchen',
          bathroom: 'Bathroom',
        }
      }),
    };

    mockXLSX = {
      utils: {
        json_to_sheet: vi.fn(),
        book_new: vi.fn(),
        book_append_sheet: vi.fn(),
        sheet_to_json: vi.fn(),
      },
      read: vi.fn(),
      writeFile: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ExcelService,
        { provide: ExcelSettingsService, useValue: mockExcelSettingsService },
      ],
    });

    service = TestBed.inject(ExcelService);

    // Mock dynamic import of xlsx
    // We can spy on the private getXLSX method or mock import.
    // Since getXLSX is private, we can use (service as any) or spy on it if we could.
    // But dynamic import mocking is hard.
    // Instead, let's just populate the xlsxModule private property if possible?
    (service as any).xlsxModule = mockXLSX;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('exportWaterToExcel', () => {
    it('should create and download excel file', async () => {
      const records = [
        { date: new Date('2023-01-01'), kitchenWarm: 10, kitchenCold: 20, bathroomWarm: 30, bathroomCold: 40 }
      ];
      mockXLSX.utils.json_to_sheet.mockReturnValue('sheet');
      mockXLSX.utils.book_new.mockReturnValue('book');

      await service.exportWaterToExcel(records, 'test.xlsx');

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([{
        'Date': '2023-01-01',
        'Kitchen Warm': 10,
        'Kitchen Cold': 20,
        'Bathroom Warm': 30,
        'Bathroom Cold': 40
      }]);
      expect(mockXLSX.utils.book_append_sheet).toHaveBeenCalledWith('book', 'sheet', 'Data');
      expect(mockXLSX.writeFile).toHaveBeenCalledWith('book', 'test.xlsx');
    });
  });

  describe('exportHeatingToExcel', () => {
    it('should create and download excel file', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          rooms: {
            livingRoom: 10,
            bedroom: 20,
            kitchen: 30,
            bathroom: 40
          }
        }
      ];
      mockXLSX.utils.json_to_sheet.mockReturnValue('sheet');
      mockXLSX.utils.book_new.mockReturnValue('book');

      await service.exportHeatingToExcel(records, 'test.xlsx');

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([{
        'Date': '2023-01-01',
        'Living Room': 10,
        'Bedroom': 20,
        'Kitchen': 30,
        'Bathroom': 40
      }]);
    });
  });

  describe('importWaterFromExcel', () => {
    // Helper to mock FileReader behavior
    const mockFileReader = (data: any) => {
      const originalFileReader = window.FileReader;
      window.FileReader = class {
        readAsBinaryString() {
          setTimeout(() => {
            if (this.onload) this.onload({ target: { result: data } } as any);
          }, 0);
        }
        onload: any;
        onerror: any;
      } as any;
      return () => { window.FileReader = originalFileReader; };
    };

    it('should import valid records', async () => {
      const sheetData = [
        { 'Date': '2023-01-01', 'Kitchen Warm': 10, 'Kitchen Cold': 20, 'Bathroom Warm': 30, 'Bathroom Cold': 40 }
      ];

      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('dummy-binary-string');
      const file = new File([''], 'test.xlsx');

      const result = await service.importWaterFromExcel(file);

      cleanup();

      expect(result.records.length).toBe(1);
      expect(result.records[0].kitchenWarm).toBe(10);
    });

    it('should throw if file empty', async () => {
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue([]);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow('The Excel file is empty');
      cleanup();
    });

    it('should throw if missing date column', async () => {
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        { 'Wrong Date': '...' }
      ]);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow('Missing required Date column');
      cleanup();
    });

    it('should aggregate validation errors', async () => {
      const sheetData = [
        { 'Date': 'invalid', 'Kitchen Warm': 'NaN' }
      ];
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow('Invalid date value');
      // It might also have number error but logic skips row if date invalid?
      // Code: "if (!date) { ... continue; }"
      // So only invalid date error.
      cleanup();
    });

    it('should handle duplicate dates', async () => {
      const sheetData = [
        { 'Date': '2023-01-01', 'Kitchen Warm': 10 },
        { 'Date': '2023-01-01', 'Kitchen Warm': 20 }
      ];
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow('Duplicate date');
      cleanup();
    });
  });

  describe('importHeatingFromExcel', () => {
    // Similar logic, just test success case
    it('should import valid records', async () => {
      const mockFileReader = (data: any) => {
        const originalFileReader = window.FileReader;
        window.FileReader = class {
          readAsBinaryString() {
            setTimeout(() => {
              if (this.onload) this.onload({ target: { result: data } } as any);
            }, 0);
          }
          onload: any;
          onerror: any;
        } as any;
        return () => { window.FileReader = originalFileReader; };
      };

      const sheetData = [
        { 'Date': '2023-01-01', 'Living Room': 10 }
      ];

      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      const result = await service.importHeatingFromExcel(file);
      cleanup();

      expect(result.records.length).toBe(1);
      expect(result.records[0].rooms['livingRoom']).toBe(10);
    });
  });

  describe('parseDate', () => {
    // Helper to call private method
    const parseDate = (val: any) => (service as any).parseDate(val);

    it('should parse ISO date string', () => {
      expect(parseDate('2023-01-01')?.toISOString()).toContain('2023-01-01');
    });

    it('should parse European date string', () => {
      const d = parseDate('31.12.2023');
      expect(d?.getFullYear()).toBe(2023);
      expect(d?.getMonth()).toBe(11);
      expect(d?.getDate()).toBe(31);
    });

    it('should parse Excel serial number', () => {
      // 1 = 1900-01-01.
      // 45000 approx 2023.
      // Let's use 2 (1900-01-01 is usually 1, but Excel has leap year bug for 1900).
      // 1900-01-01 is day 1. JS Date UTC(1900,0,1).
      // Code: excelEpoch + (value - 2) * 24*60*60*1000.
      // value=2 -> 1900-01-01.

      const d = parseDate(2);
      expect(d?.toISOString()).toContain('1900-01-01');
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid')).toBeNull();
    });
  });
});
