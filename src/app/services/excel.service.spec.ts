import { TestBed } from '@angular/core/testing';
import { ExcelService } from './excel.service';
import { ExcelSettingsService } from './excel-settings.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

interface MockUtils {
  book_new: ReturnType<typeof vi.fn>;
  book_append_sheet: ReturnType<typeof vi.fn>;
  sheet_to_json: ReturnType<typeof vi.fn>;
  json_to_sheet: ReturnType<typeof vi.fn>;
}

interface MockXLSX {
  utils: MockUtils;
  read: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
}

describe('ExcelService', () => {
  let service: ExcelService;
  let mockExcelSettingsService: {
    getWaterMapping: ReturnType<typeof vi.fn>;
    getHeatingMapping: ReturnType<typeof vi.fn>;
    getElectricityMapping: ReturnType<typeof vi.fn>;
  };
  let mockXLSX: MockXLSX;

  const mockFileReader = (data: unknown) => {
    const originalFileReader = window.FileReader;
    window.FileReader = class {
      readAsBinaryString() {
        setTimeout(() => {
          if (this.onload) {
            this.onload({
              target: { result: data },
            } as unknown as ProgressEvent<FileReader>);
          }
        }, 0);
      }
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    } as unknown as typeof FileReader;
    return () => {
      window.FileReader = originalFileReader;
    };
  };

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
        },
      }),
      getElectricityMapping: vi.fn().mockReturnValue({
        date: 'Date',
        value: 'Electricity Consumption (kWh)',
      }),
    };

    mockXLSX = {
      utils: {
        book_new: vi.fn(),
        book_append_sheet: vi.fn(),
        sheet_to_json: vi.fn(),
        json_to_sheet: vi.fn(),
      },
      read: vi.fn(),
      writeFile: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ExcelService,
        { provide: ExcelSettingsService, useValue: mockExcelSettingsService },
        {
          provide: LanguageService,
          useValue: {
            translate: (key: string) => key,
          },
        },
      ],
    });

    service = TestBed.inject(ExcelService);
    service['xlsxModule'] = mockXLSX as unknown as typeof import('xlsx');
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
        {
          date: new Date('2023-01-01'),
          kitchenWarm: 10,
          kitchenCold: 20,
          bathroomWarm: 30,
          bathroomCold: 40,
        },
      ];
      mockXLSX.utils.json_to_sheet.mockReturnValue('sheet');
      mockXLSX.utils.book_new.mockReturnValue('book');

      await service.exportWaterToExcel(records, 'test.xlsx');

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          Date: '2023-01-01',
          'Kitchen Warm': 10,
          'Kitchen Cold': 20,
          'Bathroom Warm': 30,
          'Bathroom Cold': 40,
        },
      ]);
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
            bathroom: 40,
          },
        },
      ];

      mockXLSX.utils.json_to_sheet.mockReturnValue('sheet');
      mockXLSX.utils.book_new.mockReturnValue('book');

      await service.exportHeatingToExcel(records, 'test.xlsx');

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          Date: '2023-01-01',
          'Living Room': 10,
          Bedroom: 20,
          Kitchen: 30,
          Bathroom: 40,
        },
      ]);
      expect(mockXLSX.utils.book_append_sheet).toHaveBeenCalledWith('book', 'sheet', 'Data');
      expect(mockXLSX.writeFile).toHaveBeenCalledWith('book', 'test.xlsx');
    });
  });

  describe('exportElectricityToExcel', () => {
    it('should create and download excel file with rounded values', async () => {
      const records = [
        { date: new Date('2023-01-01'), value: 10.123 },
        { date: new Date('2023-01-02'), value: 20.567 },
        { date: new Date('2023-01-03'), value: 30 },
      ];

      mockXLSX.utils.json_to_sheet.mockReturnValue('sheet');
      mockXLSX.utils.book_new.mockReturnValue('book');

      await service.exportElectricityToExcel(records, 'test.xlsx');

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        { Date: '2023-01-01', 'Electricity Consumption (kWh)': 10 },
        { Date: '2023-01-02', 'Electricity Consumption (kWh)': 21 },
        { Date: '2023-01-03', 'Electricity Consumption (kWh)': 30 },
      ]);
      expect(mockXLSX.utils.book_append_sheet).toHaveBeenCalledWith('book', 'sheet', 'Data');
      expect(mockXLSX.writeFile).toHaveBeenCalledWith('book', 'test.xlsx');
    });
  });

  describe('importWaterFromExcel', () => {
    it('should import valid records', async () => {
      const sheetData = [
        {
          Date: '2023-01-01',
          'Kitchen Warm': 10,
          'Kitchen Cold': 20,
          'Bathroom Warm': 30,
          'Bathroom Cold': 40,
        },
      ];

      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('dummy-binary-string');
      const file = new File([''], 'test.xlsx');

      const result = await service.importWaterFromExcel(file);

      cleanup();

      expect(result.records.length).toBe(1);
      expect(result.records[0].kitchenWarm).toBe(10);
    });

    it('should throw if file empty', async () => {
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue([]);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow('ERROR.IMPORT_EMPTY_FILE');
      cleanup();
    });

    it('should throw if missing date column', async () => {
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue([{ 'Wrong Date': '...' }]);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow(
        'ERROR.IMPORT_EXCEL_MISSING_DATE_COLUMN',
      );
      cleanup();
    });

    it('should aggregate validation errors', async () => {
      const sheetData = [{ Date: 'invalid', 'Kitchen Warm': 'NaN' }];
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow(
        'ERROR.IMPORT_INVALID_DATE_VALUE',
      );
      cleanup();
    });

    it('should handle duplicate dates', async () => {
      const sheetData = [
        { Date: '2023-01-01', 'Kitchen Warm': 10 },
        { Date: '2023-01-01', 'Kitchen Warm': 20 },
      ];
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importWaterFromExcel(file)).rejects.toThrow(
        'ERROR.IMPORT_DUPLICATE_DATE',
      );
      cleanup();
    });

    it('should return missing columns', async () => {
      const sheetData = [{ Date: '2023-01-01', 'Kitchen Warm': 10 }];
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      const result = await service.importWaterFromExcel(file);
      cleanup();

      expect(result.missingColumns).toContain('Kitchen Cold');
      expect(result.missingColumns).toContain('Bathroom Warm');
      expect(result.missingColumns).toContain('Bathroom Cold');
    });

    it('should default empty values to 0', async () => {
      const sheetData = [{ Date: '2023-01-01', 'Kitchen Warm': 10, 'Kitchen Cold': '' }];
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      const result = await service.importWaterFromExcel(file);
      cleanup();

      expect(result.records[0].kitchenCold).toBe(0);
    });
  });

  describe('importHeatingFromExcel', () => {
    it('should import valid records', async () => {
      const sheetData = [{ Date: '2023-01-01', 'Living Room': 10 }];

      mockExcelSettingsService.getHeatingMapping.mockReturnValue({
        date: 'Date',
        rooms: {
          room_1: 'Living Room',
        },
      });

      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      const result = await service.importHeatingFromExcel(file);
      cleanup();

      expect(result.records.length).toBe(1);
      expect(result.records[0].rooms['room_1']).toBe(10);
    });

    it('should return missing columns', async () => {
      const sheetData = [{ Date: '2023-01-01' }];

      mockExcelSettingsService.getHeatingMapping.mockReturnValue({
        date: 'Date',
        rooms: {
          room_1: 'Living Room',
        },
      });

      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      const result = await service.importHeatingFromExcel(file);
      cleanup();

      expect(result.missingColumns).toContain('Living Room');
    });
  });

  describe('importElectricityFromExcel', () => {
    it('should import valid records', async () => {
      const sheetData = [{ Date: '2023-01-01', 'Electricity Consumption (kWh)': 100 }];

      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('dummy');
      const file = new File([''], 'test.xlsx');

      const result = await service.importElectricityFromExcel(file);
      cleanup();

      expect(result.records.length).toBe(1);
      expect(result.records[0].value).toBe(100);
    });

    it('should throw if file empty', async () => {
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue([]);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importElectricityFromExcel(file)).rejects.toThrow(
        'ERROR.IMPORT_EMPTY_FILE',
      );
      cleanup();
    });

    it('should throw if missing date column', async () => {
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue([{ 'Wrong Date': '...' }]);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importElectricityFromExcel(file)).rejects.toThrow(
        'ERROR.IMPORT_EXCEL_MISSING_DATE_COLUMN',
      );
      cleanup();
    });

    it('should return missing value column', async () => {
      const sheetData = [{ Date: '2023-01-01' }];

      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      const result = await service.importElectricityFromExcel(file);
      cleanup();

      expect(result.missingColumns).toContain('Electricity Consumption (kWh)');
    });

    it('should aggregate validation errors', async () => {
      const sheetData = [
        { Date: 'invalid', 'Electricity Consumption (kWh)': '100' },
        { Date: '2023-01-01', 'Electricity Consumption (kWh)': 'NaN' },
        { Date: '2023-01-01', 'Electricity Consumption (kWh)': '200' },
      ];
      mockXLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      mockXLSX.utils.sheet_to_json.mockReturnValue(sheetData);

      const cleanup = mockFileReader('');
      const file = new File([''], 'test.xlsx');

      await expect(service.importElectricityFromExcel(file)).rejects.toThrowError(
        /ERROR.IMPORT_INVALID_DATE_VALUE|ERROR.IMPORT_INVALID_NUMBER_VALUE|ERROR.IMPORT_DUPLICATE_DATE/,
      );
      cleanup();
    });
  });

  describe('parseDate', () => {
    const parseDate = (val: unknown) => service['parseDate'](val);

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
      const d = parseDate(2);
      expect(d?.toISOString()).toContain('1900-01-01');
    });

    it('should parse European date string with slash', () => {
      const d = parseDate('31/12/2023');
      expect(d?.getFullYear()).toBe(2023);
      expect(d?.getMonth()).toBe(11);
      expect(d?.getDate()).toBe(31);
    });

    it('should return null for logically invalid date', () => {
      expect(parseDate('01.13.2023')).toBeNull();
      expect(parseDate('32.01.2023')).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid')).toBeNull();
    });
  });
});
