import { TestBed } from '@angular/core/testing';
import { ExcelValidationService } from './excel-validation.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ExcelValidationService', () => {
  let service: ExcelValidationService;
  let mockLanguageService: any;

  beforeEach(() => {
    mockLanguageService = {
      translate: vi.fn((key: string) => key),
    };

    TestBed.configureTestingModule({
      providers: [
        ExcelValidationService,
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    });

    service = TestBed.inject(ExcelValidationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isValidColumnName', () => {
    it('should validate correct name', () => {
      expect(service.isValidColumnName('Date')).toBe(true);
      expect(service.isValidColumnName('Kitchen Warm')).toBe(true);
    });

    it('should invalidate empty or null', () => {
      expect(service.isValidColumnName('')).toBe(false);
      expect(service.isValidColumnName(null as any)).toBe(false);
    });

    it('should invalidate too long name', () => {
      expect(service.isValidColumnName('a'.repeat(256))).toBe(false);
    });

    it('should invalidate name with leading/trailing whitespace', () => {
      expect(service.isValidColumnName(' Date')).toBe(false);
      expect(service.isValidColumnName('Date ')).toBe(false);
    });

    it('should invalidate name with forbidden characters', () => {
      expect(service.isValidColumnName('Date*')).toBe(false);
      expect(service.isValidColumnName('Date/Time')).toBe(false);
      expect(service.isValidColumnName('Question?')).toBe(false);
    });
  });

  describe('getValidationError', () => {
    it('should return empty string for valid name', () => {
      expect(service.getValidationError('Date')).toBe('');
    });

    it('should return required error', () => {
      expect(service.getValidationError('')).toBe('EXCEL.VALIDATION_REQUIRED');
    });

    it('should return too long error', () => {
      expect(service.getValidationError('a'.repeat(256))).toBe('EXCEL.VALIDATION_TOO_LONG');
    });

    it('should return whitespace error', () => {
      expect(service.getValidationError(' Date')).toBe('EXCEL.VALIDATION_NO_WHITESPACE');
    });

    it('should return invalid chars error', () => {
      expect(service.getValidationError('Date*')).toBe('EXCEL.VALIDATION_INVALID_CHARS');
    });
  });

  describe('isDuplicate', () => {
    it('should return false if value not duplicate', () => {
      expect(service.isDuplicate('A', ['A', 'B'])).toBe(false);
    });

    it('should return true if value is duplicate', () => {
      expect(service.isDuplicate('A', ['A', 'A'])).toBe(true);
    });

    it('should return false for empty value', () => {
      expect(service.isDuplicate('', ['', ''])).toBe(false);
    });
  });

  describe('validateMappings', () => {
    it('should return valid for correct mappings', () => {
      const water = ['A', 'B'];
      const heating = ['C', 'D'];
      const result = service.validateMappings(water, heating);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid if some fields empty', () => {
      const water = ['A', ''];
      const heating = ['C', 'D'];
      const result = service.validateMappings(water, heating);
      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('EXCEL.VALIDATION_FORM_INVALID');
    });

    it('should return invalid if some fields have invalid format', () => {
      const water = ['A*', 'B'];
      const heating = ['C', 'D'];
      const result = service.validateMappings(water, heating);
      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('EXCEL.VALIDATION_FORM_INVALID');
    });

    it('should return invalid if duplicates within category', () => {
      const water = ['A', 'A'];
      const heating = ['C', 'D'];
      const result = service.validateMappings(water, heating);
      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('EXCEL.VALIDATION_DUPLICATES');
    });

    it('should return valid if same name used in different categories (allowed?)', () => {
      // Logic checks duplicates within waterColumns separately from heatingColumns?
      // new Set(waterColumns) vs new Set(heatingColumns).
      // Yes.
      const water = ['A', 'B'];
      const heating = ['A', 'C'];
      const result = service.validateMappings(water, heating);
      expect(result.isValid).toBe(true);
    });
  });
});
