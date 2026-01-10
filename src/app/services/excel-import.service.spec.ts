import { TestBed } from '@angular/core/testing';
import { ExcelImportService, ImportError } from './excel-import.service';
import { LanguageService } from './language.service';
import { ExcelValidationService } from './excel-validation.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ExcelImportService', () => {
  let service: ExcelImportService;
  let mockLanguageService: any;
  let mockValidationService: any;

  beforeEach(() => {
    mockLanguageService = {
      translate: vi.fn((key: string) => key),
    };

    mockValidationService = {
      getValidationError: vi.fn().mockImplementation((val) => {
          if (!val) return 'Error';
          return '';
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ExcelImportService,
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ExcelValidationService, useValue: mockValidationService },
      ],
    });

    service = TestBed.inject(ExcelImportService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateImportedSettings', () => {
    it('should throw if data is not object', () => {
      try {
        service.validateImportedSettings('invalid');
        expect(true).toBe(false); // Should not reach here
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT');
      }
    });

    it('should throw if invalid structure (missing keys)', () => {
      try {
        service.validateImportedSettings({});
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT');
      }
    });

    it('should validate valid settings', () => {
      const validData = {
        enabled: true,
        waterMapping: {
          date: 'Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
          date: 'Date',
          livingRoom: 'L',
          bedroom: 'B',
          kitchen: 'K',
          bathroom: 'BA'
        }
      };

      const result = service.validateImportedSettings(validData);
      expect(result).toEqual(validData);
    });

    it('should throw on validation errors (missing fields)', () => {
      const invalidData = {
        enabled: true,
        // Missing waterMapping
        heatingMapping: {
          date: 'Date',
          livingRoom: 'L',
          bedroom: 'B',
          kitchen: 'K',
          bathroom: 'BA'
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('SETTINGS.IMPORT_EXCEL_MISSING_WATER');
      }
    });

    it('should throw on validation errors (invalid field types)', () => {
      const invalidData = {
        enabled: true,
        waterMapping: {
          date: 123, // Invalid type
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
           date: 'Date',
           livingRoom: 'L',
           bedroom: 'B',
           kitchen: 'K',
           bathroom: 'BA'
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('EXCEL.VALIDATION_GOT_NUMBER');
      }
    });

    it('should detect duplicates', () => {
      const duplicateData = {
        enabled: true,
        waterMapping: {
          date: 'Date',
          kitchenWarm: 'Duplicate',
          kitchenCold: 'Duplicate',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
           date: 'Date',
           livingRoom: 'L',
           bedroom: 'B',
           kitchen: 'K',
           bathroom: 'BA'
        }
      };

      try {
          service.validateImportedSettings(duplicateData);
          expect(true).toBe(false);
      } catch (e: any) {
          expect(e.details).toContain('EXCEL.VALIDATION_DUPLICATES');
          expect(e.details).toContain('Duplicate');
      }
    });
  });

  describe('mapImportError', () => {
      it('should map invalid_file_type', () => {
          const result = service.mapImportError({ message: 'invalid_file_type' });
          expect(result.message).toBe('SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE');
      });

      it('should map parse error', () => {
          const result = service.mapImportError({ message: 'Failed to parse JSON file' });
          expect(result.message).toBe('SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT');
      });

      it('should map generic validation error with details', () => {
          const error: ImportError = {
              message: 'Validation Failed',
              details: 'Details...',
              hintKeys: ['HINT1']
          };
          const result = service.mapImportError(error);
          expect(result.message).toBe('Validation Failed');
          expect(result.details).toBe('Details...');
          expect(result.instructions).toEqual(['HINT1']);
      });

      it('should map generic error without hints', () => {
          const result = service.mapImportError({ message: 'Unknown' });
          expect(result.instructions[0]).toBe('HOME.IMPORT_ERROR_INSTRUCTION_1');
      });
  });
});
