import { Injectable, inject } from '@angular/core';
import { CountryService } from './country.service';

/**
 * Service for validating form fields across the application.
 * Includes address fields, person names, and other common validations.
 */
@Injectable({
  providedIn: 'root'
})
export class FormValidationService {
  private countryService = inject(CountryService);

  /**
   * Validates that a string contains at least one letter (including German umlauts)
   */
  hasLetters(value: string): boolean {
    return /[a-zA-ZäöüÄÖÜß]/.test(value);
  }

  /**
   * Validate street name: 2-50 characters, must contain at least one letter
   */
  getStreetNameError(value: unknown): string[] {
    const errors: string[] = [];
    if (!value) return [];
    if (typeof value !== 'string') return ['SETTINGS.ERRORS.INVALID_DATA_TYPE'];

    if (value.trim() === '') return [];
    if (value.length < 2) errors.push('SETTINGS.ERRORS.TOO_SHORT');
    if (value.length > 50) errors.push('SETTINGS.ERRORS.STREET_TOO_LONG');
    if (!this.hasLetters(value)) errors.push('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');
    return errors;
  }

  /**
   * Validate street number: max 10 characters, alphanumeric with hyphens/slashes
   */
  getStreetNumberError(value: unknown): string[] {
    const errors: string[] = [];
    if (!value) return [];
    if (typeof value !== 'string') return ['SETTINGS.ERRORS.INVALID_DATA_TYPE'];

    if (value.trim() === '') return [];
    if (value.length > 10) errors.push('SETTINGS.ERRORS.NUMBER_TOO_LONG');
    if (!/^[a-zA-Z0-9\s\-\/]+$/.test(value)) errors.push('SETTINGS.ERRORS.INVALID_STREET_NUMBER');
    return errors;
  }

  /**
   * Validate city: 2-50 characters, must contain at least one letter
   */
  getCityError(value: unknown): string[] {
    const errors: string[] = [];
    if (!value) return [];
    if (typeof value !== 'string') return ['SETTINGS.ERRORS.INVALID_DATA_TYPE'];

    if (value.trim() === '') return [];
    if (value.length < 2) errors.push('SETTINGS.ERRORS.TOO_SHORT');
    if (value.length > 50) errors.push('SETTINGS.ERRORS.CITY_TOO_LONG');
    if (!this.hasLetters(value)) errors.push('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');
    return errors;
  }

  /**
   * Validate zip code: numeric only, max 10 characters
   */
  getZipCodeError(value: unknown): string[] {
    const errors: string[] = [];
    if (!value) return [];
    if (typeof value !== 'string') return ['SETTINGS.ERRORS.INVALID_DATA_TYPE'];

    if (value.trim() === '') return [];
    if (value.length > 10) errors.push('SETTINGS.ERRORS.ZIP_TOO_LONG');
    if (!/^\d+$/.test(value)) errors.push('SETTINGS.ERRORS.NUMBER_ONLY');
    return errors;
  }

  /**
   * Validate country: must be a valid country code
   */
  getCountryError(value: unknown): string[] {
    if (!value) return [];
    if (typeof value !== 'string') return ['SETTINGS.ERRORS.INVALID_DATA_TYPE'];

    if (value.trim() === '') return [];
    // Check if it's a valid country code
    const info = this.countryService.getCountryInfoByCode(value.trim());
    return info ? [] : ['SETTINGS.ERRORS.INVALID_COUNTRY'];
  }

  // ---- Generic name validation (for family members, etc.) ----

  /**
   * Validate a person's name: 2-50 characters, must contain at least one letter
   * Returns a single error key or empty string (unlike address methods which return arrays)
   */
  getNameError(value: unknown): string {
    if (!value) return '';
    if (typeof value !== 'string') return 'SETTINGS.ERRORS.INVALID_DATA_TYPE';

    if (value.trim() === '') return '';
    if (value.length < 2) return 'SETTINGS.ERRORS.TOO_SHORT';
    if (value.length > 50) return 'SETTINGS.ERRORS.TOO_LONG';
    if (!this.hasLetters(value)) return 'SETTINGS.ERRORS.MUST_CONTAIN_LETTERS';
    return '';
  }

  /**
   * Validate a person's surname: 2-50 characters, must contain at least one letter
   */
  getSurnameError(value: unknown): string {
    return this.getNameError(value); // Same rules as name
  }
}
