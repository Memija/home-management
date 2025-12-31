import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root'
})
export class ExcelValidationService {
  private languageService = inject(LanguageService);

  /**
   * Validate Excel column name
   * Rules:
   * - Not empty
   * - Max 255 characters
   * - No invalid characters: [ ] * / \ ? :
   * - No leading/trailing whitespace
   */
  isValidColumnName(name: string): boolean {
    if (!name || name.trim() === '') return false;
    if (name.length > 255) return false;
    // Check for leading/trailing whitespace
    if (name !== name.trim()) return false;

    // Excel forbidden characters for sheet names apply to column headers usually too to be safe,
    // but here we just want to avoid special chars that might cause issues.
    // [ ] * / \ ? : are standard forbidden chars in Excel sheet names/paths
    const invalidChars = /[\[\]\*\/\\\?\:]/;
    if (invalidChars.test(name)) return false;

    return true;
  }

  /**
   * Get validation error message for a column name
   */
  getValidationError(name: string): string {
    if (!name || name.trim() === '') {
      return this.languageService.translate('EXCEL.VALIDATION_REQUIRED');
    }
    if (name.length > 255) {
      return this.languageService.translate('EXCEL.VALIDATION_TOO_LONG');
    }
    if (name !== name.trim()) {
      return this.languageService.translate('EXCEL.VALIDATION_NO_WHITESPACE');
    }
    const invalidChars = /[\[\]\*\/\\\?\:]/;
    if (invalidChars.test(name)) {
      return this.languageService.translate('EXCEL.VALIDATION_INVALID_CHARS');
    }
    return '';
  }

  /**
   * Check if a column name is duplicated within a set of values
   */
  isDuplicate(value: string, allValues: string[]): boolean {
    if (!value || value.trim() === '') return false;
    const trimmed = value.trim();
    return allValues.map(c => c.trim()).filter(c => c === trimmed).length > 1;
  }

  /**
   * Validate all mappings for validity and duplicates
   */
  validateMappings(waterColumns: string[], heatingColumns: string[]): { isValid: boolean, errorKey?: string } {
    const allFields = [...waterColumns, ...heatingColumns];

    // Check if all fields are filled
    if (allFields.some(field => !field || field.trim() === '')) {
      return { isValid: false, errorKey: 'EXCEL.VALIDATION_FORM_INVALID' }; // Assuming generic invalid form message relates to empty/invalid fields
    }

    // Check if all fields pass format validation
    if (!allFields.every(field => this.isValidColumnName(field))) {
      return { isValid: false, errorKey: 'EXCEL.VALIDATION_FORM_INVALID' };
    }

    // Check for duplicates
    if (new Set(waterColumns.map(c => c.trim())).size !== waterColumns.length ||
      new Set(heatingColumns.map(c => c.trim())).size !== heatingColumns.length) {
      return { isValid: false, errorKey: 'EXCEL.VALIDATION_DUPLICATES' };
    }

    return { isValid: true };
  }
}
