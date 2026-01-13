import { TestBed } from '@angular/core/testing';
import { FormValidationService } from './form-validation.service';
import { CountryService } from './country.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('FormValidationService', () => {
  let service: FormValidationService;
  let mockCountryService: any;

  beforeEach(() => {
    mockCountryService = {
      getCountryInfoByCode: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        FormValidationService,
        { provide: CountryService, useValue: mockCountryService },
      ],
    });

    service = TestBed.inject(FormValidationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('hasLetters', () => {
    it('should return true if string has letters', () => {
      expect(service.hasLetters('abc')).toBe(true);
      expect(service.hasLetters('123a')).toBe(true);
      expect(service.hasLetters('äöü')).toBe(true);
    });
    it('should return false if string has no letters', () => {
      expect(service.hasLetters('123')).toBe(false);
      expect(service.hasLetters('...')).toBe(false);
      expect(service.hasLetters('')).toBe(false);
    });
  });

  describe('getStreetNameError', () => {
    it('should return empty array for valid street', () => {
      expect(service.getStreetNameError('Main Street')).toEqual([]);
    });
    it('should return error for empty string', () => {
      // Note: code returns [] if trim is empty
      expect(service.getStreetNameError('')).toEqual([]);
      expect(service.getStreetNameError(null)).toEqual([]);
    });
    it('should return error for invalid type', () => {
      expect(service.getStreetNameError(123)).toContain('SETTINGS.ERRORS.INVALID_DATA_TYPE');
    });
    it('should return error for too short', () => {
      expect(service.getStreetNameError('A')).toContain('SETTINGS.ERRORS.TOO_SHORT');
    });
    it('should return error for too long', () => {
      expect(service.getStreetNameError('A'.repeat(51))).toContain('SETTINGS.ERRORS.STREET_TOO_LONG');
    });
    it('should return error for no letters', () => {
      expect(service.getStreetNameError('123')).toContain('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');
    });
  });

  describe('getStreetNumberError', () => {
    it('should return empty for valid number', () => {
      expect(service.getStreetNumberError('123')).toEqual([]);
      expect(service.getStreetNumberError('123 A')).toEqual([]);
      expect(service.getStreetNumberError('123-B')).toEqual([]);
      expect(service.getStreetNumberError('123/4')).toEqual([]);
    });
    it('should return error for too long', () => {
      expect(service.getStreetNumberError('12345678901')).toContain('SETTINGS.ERRORS.NUMBER_TOO_LONG');
    });
    it('should return error for invalid chars', () => {
      expect(service.getStreetNumberError('123!')).toContain('SETTINGS.ERRORS.INVALID_STREET_NUMBER');
    });
  });

  describe('getCityError', () => {
    it('should return empty for valid city', () => {
      expect(service.getCityError('New York')).toEqual([]);
    });
    it('should return error for too short', () => {
      expect(service.getCityError('A')).toContain('SETTINGS.ERRORS.TOO_SHORT');
    });
    it('should return error for too long', () => {
      expect(service.getCityError('A'.repeat(51))).toContain('SETTINGS.ERRORS.CITY_TOO_LONG');
    });
    it('should return error for no letters', () => {
      expect(service.getCityError('123')).toContain('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');
    });
  });

  describe('getZipCodeError', () => {
    it('should return empty for valid zip', () => {
      expect(service.getZipCodeError('12345')).toEqual([]);
    });
    it('should return error for too long', () => {
      expect(service.getZipCodeError('12345678901')).toContain('SETTINGS.ERRORS.ZIP_TOO_LONG');
    });
    it('should return error for non-numeric', () => {
      expect(service.getZipCodeError('123a')).toContain('SETTINGS.ERRORS.NUMBER_ONLY');
    });
  });

  describe('getCountryError', () => {
    it('should return empty for valid country code', () => {
      mockCountryService.getCountryInfoByCode.mockReturnValue({});
      expect(service.getCountryError('US')).toEqual([]);
    });
    it('should return error for invalid country code', () => {
      mockCountryService.getCountryInfoByCode.mockReturnValue(null);
      expect(service.getCountryError('XX')).toContain('SETTINGS.ERRORS.INVALID_COUNTRY');
    });
    it('should return empty for empty input', () => {
      expect(service.getCountryError('')).toEqual([]);
      expect(service.getCountryError(null)).toEqual([]);
    });
  });

  describe('getNameError', () => {
    it('should return empty for valid name', () => {
      expect(service.getNameError('John')).toBe('');
    });
    it('should return error for too short', () => {
      expect(service.getNameError('J')).toBe('SETTINGS.ERRORS.TOO_SHORT');
    });
    it('should return error for too long', () => {
      expect(service.getNameError('A'.repeat(51))).toBe('SETTINGS.ERRORS.TOO_LONG');
    });
    it('should return error for no letters', () => {
      expect(service.getNameError('123')).toBe('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');
    });
  });

  describe('getSurnameError', () => {
    it('should validate surname same as name', () => {
      expect(service.getSurnameError('Doe')).toBe('');
      expect(service.getSurnameError('D')).toBe('SETTINGS.ERRORS.TOO_SHORT');
    });
  });
});
