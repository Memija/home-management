import { TestBed } from '@angular/core/testing';
import { ExcelImportService, ImportError } from './excel-import.service';
import { LanguageService } from './language.service';
import { ExcelValidationService } from './excel-validation.service';
import { HeatingRoomsService } from './heating-rooms.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ExcelImportService', () => {
  let service: ExcelImportService;
  let mockLanguageService: any;
  let mockValidationService: any;

  beforeEach(() => {
    mockLanguageService = {
      translate: vi.fn((key: string) => {
        const placeholders: Record<string, string> = {
          'SETTINGS.IMPORT_EXCEL_UNKNOWN_ROOMS': 'SETTINGS.IMPORT_EXCEL_UNKNOWN_ROOMS {{rooms}}',
          'SETTINGS.IMPORT_EXCEL_MISSING_ROOM_MAPPINGS': 'SETTINGS.IMPORT_EXCEL_MISSING_ROOM_MAPPINGS {{rooms}}',
          'SETTINGS.IMPORT_EXCEL_UNEXPECTED_FIELDS': 'SETTINGS.IMPORT_EXCEL_UNEXPECTED_FIELDS {{fields}}',
          'SETTINGS.IMPORT_EXCEL_CROSS_SECTION_DUPLICATES': 'SETTINGS.IMPORT_EXCEL_CROSS_SECTION_DUPLICATES {{columns}}'
        };
        return placeholders[key] || key;
      }),
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
        {
          provide: HeatingRoomsService,
          useValue: {
            rooms: vi.fn().mockReturnValue([
              { id: 'livingRoom', name: 'Living Room' },
              { id: 'bedroom', name: 'Bedroom' },
              { id: 'kitchen', name: 'Kitchen' },
              { id: 'bathroom', name: 'Bathroom' }
            ])
          }
        }
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
          date: 'Water Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
          date: 'Heating Date',
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          }
        }
      };

      const result = service.validateImportedSettings(validData);

      const expected = {
        ...validData,
        electricityMapping: {
          date: 'Date',
          value: 'Electricity Consumption (kWh)'
        }
      };

      expect(result).toEqual(expected);
    });

    it('should throw on validation errors (missing fields)', () => {
      const invalidData = {
        enabled: true,
        // Missing waterMapping
        heatingMapping: {
          date: 'Date',
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          }
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
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          }
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
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          }
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

  describe('Electricity Mapping', () => {
    it('should validate valid electricity mapping', () => {
      const validData = {
        enabled: true,
        waterMapping: {
          date: 'Water Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
          date: 'Heating Date',
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          }
        },
        electricityMapping: {
          date: 'Elec Date',
          value: 'Elec Value'
        }
      };

      const result = service.validateImportedSettings(validData);
      expect(result.electricityMapping).toEqual(validData.electricityMapping);
    });

    it('should throw if electricity mapping is missing required fields', () => {
      const invalidData = {
        enabled: true,
        waterMapping: {
          date: 'Water Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        electricityMapping: {
          date: 'Elec Date'
          // Missing value
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('SETTINGS.EXCEL_COLUMN_ELECTRICITY_VALUE_NAME');
      }
    });

    it('should detect duplicates in electricity mapping', () => {
      const duplicateData = {
        enabled: true,
        electricityMapping: {
          date: 'Same Column',
          value: 'Same Column'
        }
      };

      try {
        service.validateImportedSettings(duplicateData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('EXCEL.VALIDATION_DUPLICATES');
        expect(e.details).toContain('Same Column');
      }
    });
  });

  describe('Cross-Section Duplicates', () => {
    it('should detect duplicates between Water and Heating mappings', () => {
      const crossDuplicateData = {
        enabled: true,
        waterMapping: {
          date: 'Shared Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
          date: 'Shared Date', // Duplicate with Water
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          }
        }
      };

      try {
        service.validateImportedSettings(crossDuplicateData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('SETTINGS.IMPORT_EXCEL_CROSS_SECTION_DUPLICATES');
        expect(e.details).toContain('shared date');
      }
    });

    it('should NOT throw if no duplicates between sections', () => {
      const validData = {
        enabled: true,
        waterMapping: {
          date: 'Water Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
          date: 'Heating Date',
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          }
        }
      };

      const result = service.validateImportedSettings(validData);
      expect(result).toBeTruthy();
    });
  });

  describe('Enabled Flag', () => {
    it('should add error if enabled is not boolean', () => {
      const invalidData = {
        enabled: 'true', // string instead of boolean
        waterMapping: {
          date: 'Water Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.details).toContain('SETTINGS.IMPORT_EXCEL_INVALID_ENABLED');
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

  describe('Dynamic Room Configuration', () => {
    it('should validate settings with dynamic room IDs', () => {
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
          date: 'Heating Date',
          rooms: {
            livingRoom: 'Living Room Column',
            bedroom: 'Bedroom Column',
            kitchen: 'Kitchen Column',
            bathroom: 'Bathroom Column'
          }
        }
      };

      const result = service.validateImportedSettings(validData);
      expect(result.heatingMapping.rooms).toEqual(validData.heatingMapping.rooms);
    });

    it('should validate settings with matching room IDs', () => {
      // Room IDs must match ALL rooms from the mocked HeatingRoomsService
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
          date: 'Heating Date',
          rooms: {
            livingRoom: 'Living Room Column',
            bedroom: 'Bedroom Column',
            kitchen: 'Kitchen Column',
            bathroom: 'Bathroom Column'
          }
        }
      };

      const result = service.validateImportedSettings(validData);
      expect(Object.keys(result.heatingMapping.rooms).length).toBe(4);
    });

    it('should throw on empty rooms object', () => {
      const invalidData = {
        enabled: true,
        waterMapping: {
          date: 'Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
          date: 'Heating Date',
          rooms: {}
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
      }
    });

    it('should throw if rooms has invalid column values', () => {
      const invalidData = {
        enabled: true,
        waterMapping: {
          date: 'Date',
          kitchenWarm: 'KW',
          kitchenCold: 'KC',
          bathroomWarm: 'BW',
          bathroomCold: 'BC'
        },
        heatingMapping: {
          date: 'Heating Date',
          rooms: {
            livingRoom: '', // Empty value
            bedroom: 'Bedroom'
          }
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
      }
    });
    it('should detect unknown rooms (extra room IDs)', () => {
      const invalidData = {
        enabled: true,
        heatingMapping: {
          date: 'Heating Date',
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA',
            extraRoom: 'E' // Unknown room ID
          }
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('SETTINGS.IMPORT_EXCEL_UNKNOWN_ROOMS');
        expect(e.details).toContain('extraRoom');
      }
    });

    it('should detect missing rooms (configured room IDs not in import)', () => {
      const invalidData = {
        enabled: true,
        heatingMapping: {
          date: 'Heating Date',
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            // Missing kitchen and bathroom
          }
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('SETTINGS.IMPORT_EXCEL_MISSING_ROOM_MAPPINGS');
        expect(e.details).toContain('Kitchen');
        expect(e.details).toContain('Bathroom');
      }
    });

    it('should detect unexpected fields in heating mapping', () => {
      const invalidData = {
        enabled: true,
        heatingMapping: {
          date: 'Heating Date',
          rooms: {
            livingRoom: 'L',
            bedroom: 'B',
            kitchen: 'K',
            bathroom: 'BA'
          },
          unexpectedField: 'Value' // Disallowed field
        }
      };

      try {
        service.validateImportedSettings(invalidData);
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('SETTINGS.VALIDATION_FAILED');
        expect(e.details).toContain('SETTINGS.IMPORT_EXCEL_UNEXPECTED_FIELDS');
        expect(e.details).toContain('unexpectedField');
      }
    });
  });
});
