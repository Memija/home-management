import { TestBed } from '@angular/core/testing';
import { ImportValidationService } from './import-validation.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ImportValidationService', () => {
  let service: ImportValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ImportValidationService]
    });
    service = TestBed.inject(ImportValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateDataArray', () => {
    it('should validate valid array', () => {
      expect(service.validateDataArray([{}])).toBeNull();
    });

    it('should error if not array', () => {
      expect(service.validateDataArray({} as any)).toContain('Invalid data format');
    });

    it('should error if empty array', () => {
      expect(service.validateDataArray([])).toContain('The file is empty');
    });
  });

  describe('validateWaterJsonImport', () => {
    it('should validate correct water records', () => {
      const data = [
        {
          date: '2023-01-01',
          kitchenWarm: 10,
          kitchenCold: 20,
          bathroomWarm: 30,
          bathroomCold: 40
        }
      ];
      const result = service.validateWaterJsonImport(data);
      expect(result.validRecords.length).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(result.validRecords[0].kitchenWarm).toBe(10);
    });

    it('should handle numeric strings', () => {
      const data = [
        {
          date: '2023-01-01',
          kitchenWarm: "10",
          kitchenCold: "20",
          bathroomWarm: "30",
          bathroomCold: "40"
        }
      ];
      const result = service.validateWaterJsonImport(data);
      expect(result.validRecords.length).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(result.validRecords[0].kitchenWarm).toBe(10);
    });

    it('should handle missing numeric fields by defaulting to 0', () => {
      const data = [
        {
          date: '2023-01-01'
        }
      ];
      const result = service.validateWaterJsonImport(data);
      expect(result.validRecords.length).toBe(1);
      expect(result.validRecords[0].kitchenWarm).toBe(0);
    });

    it('should error on invalid date', () => {
      const data = [
        {
          date: 'invalid-date'
        }
      ];
      const result = service.validateWaterJsonImport(data);
      expect(result.validRecords.length).toBe(0);
      expect(result.errors[0]).toContain('Invalid date value');
    });

    it('should error on duplicate dates', () => {
      const data = [
        { date: '2023-01-01' },
        { date: '2023-01-01' }
      ];
      const result = service.validateWaterJsonImport(data);
      expect(result.validRecords.length).toBe(1); // First one is accepted
      expect(result.errors[0]).toContain('Duplicate date');
    });

    it('should error on invalid numeric fields', () => {
      const data = [
        {
          date: '2023-01-01',
          kitchenWarm: 'invalid'
        }
      ];
      const result = service.validateWaterJsonImport(data);
      expect(result.validRecords.length).toBe(0);
      expect(result.errors[0]).toContain('Invalid number value');
    });

    it('should error on missing date field', () => {
      const data = [
        { kitchenWarm: 10 }
      ];
      const result = service.validateWaterJsonImport(data);
      expect(result.errors[0]).toContain("Missing 'date' field");
    });

    it('should error on invalid record format', () => {
      const data = [null];
      const result = service.validateWaterJsonImport(data);
      expect(result.errors[0]).toContain("Invalid record format");
    });
  });

  describe('validateHeatingJsonImport', () => {
    it('should validate correct heating records', () => {
      const data = [
        {
          date: '2023-01-01',
          livingRoom: 10,
          bedroom: 20,
          kitchen: 30,
          bathroom: 40
        }
      ];
      const result = service.validateHeatingJsonImport(data);
      expect(result.validRecords.length).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(result.validRecords[0].livingRoom).toBe(10);
    });
    // Similar tests as water for invalid inputs, as it shares underlying logic
    it('should error on invalid numeric fields', () => {
      const data = [
        {
          date: '2023-01-01',
          livingRoom: 'invalid'
        }
      ];
      const result = service.validateHeatingJsonImport(data);
      expect(result.validRecords.length).toBe(0);
      expect(result.errors[0]).toContain('Invalid number value');
    });
  });

  describe('getJsonErrorInstructions', () => {
    it('should return instructions for date errors', () => {
      const instructions = service.getJsonErrorInstructions('Invalid date');
      expect(instructions).toContain('ERROR.JSON_DATE_FIX_1');
    });

    it('should return instructions for number errors', () => {
      const instructions = service.getJsonErrorInstructions('Invalid number value');
      expect(instructions).toContain('ERROR.JSON_NUMBER_FIX_1');
    });

    it('should return instructions for duplicate errors', () => {
      const instructions = service.getJsonErrorInstructions('Duplicate date');
      expect(instructions).toContain('ERROR.JSON_DUPLICATE_FIX_1');
    });

    it('should return generic instructions if error unknown', () => {
      const instructions = service.getJsonErrorInstructions('Unknown error');
      expect(instructions[0]).toContain('HOME.IMPORT_ERROR_INSTRUCTION_1');
    });
  });

  describe('getExcelErrorInstructions', () => {
    it('should return instructions for excel errors', () => {
      expect(service.getExcelErrorInstructions('Invalid date')).toContain('ERROR.EXCEL_DATE_FIX_1');
      expect(service.getExcelErrorInstructions('Missing required column')).toContain('ERROR.EXCEL_COLUMN_FIX_1');
    });
    it('should return generic instructions if error unknown', () => {
      expect(service.getExcelErrorInstructions('Unknown error')).toContain('ERROR.EXCEL_GENERIC_FIX_1');
    });
  });
});
