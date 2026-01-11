import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';
import { ExcelValidationService } from './excel-validation.service';
import { ExcelSettings, WaterColumnMapping, HeatingColumnMapping } from './excel-settings.service';

export interface ImportError {
  message: string;
  details?: string;
  fieldKeys?: string[];
  hintKeys?: string[];
  error?: string; // Sometimes errors wrap other errors
}

@Injectable({
  providedIn: 'root'
})
export class ExcelImportService {
  private languageService = inject(LanguageService);
  private validationService = inject(ExcelValidationService);

  /**
   * Validate imported settings data structure and content
   * Throws an ImportError if invalid
   */
  validateImportedSettings(data: unknown): ExcelSettings {
    const errors: string[] = [];
    const fieldKeys: string[] = [];
    const hintKeys: string[] = [];

    // 1. Structure Check
    if (!data || typeof data !== 'object') {
      throw { message: 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT' } as ImportError;
    }

    // Loose interface for initial validation
    interface RawSettings {
      enabled?: boolean;
      waterMapping?: Partial<WaterColumnMapping>;
      heatingMapping?: Partial<HeatingColumnMapping>;
    }

    const typedData = data as RawSettings;
    const hasEnabled = 'enabled' in typedData;
    const hasWaterMapping = 'waterMapping' in typedData && typedData.waterMapping && typeof typedData.waterMapping === 'object';
    const hasHeatingMapping = 'heatingMapping' in typedData && typedData.heatingMapping && typeof typedData.heatingMapping === 'object';

    // If none of the expected fields exist
    if (!hasEnabled && !hasWaterMapping && !hasHeatingMapping) {
      throw { message: 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT' } as ImportError;
    }

    // Validation
    if (!hasEnabled || typeof typedData.enabled !== 'boolean') {
      errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_INVALID_ENABLED'));
      hintKeys.push('SETTINGS.IMPORT_EXCEL_INVALID_ENABLED_HINT');
    }

    // 2. Water Mapping Validation
    if (!hasWaterMapping) {
      errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_MISSING_WATER'));
      hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_WATER_HINT');
    } else {
      const w = typedData.waterMapping!;
      this.validateField(w.date, 'SETTINGS.EXCEL_COLUMN_DATE_NAME', 'Water', errors, fieldKeys, hintKeys);
      this.validateField(w.kitchenWarm, 'SETTINGS.EXCEL_COLUMN_KITCHEN_WARM_NAME', 'Water', errors, fieldKeys, hintKeys);
      this.validateField(w.kitchenCold, 'SETTINGS.EXCEL_COLUMN_KITCHEN_COLD_NAME', 'Water', errors, fieldKeys, hintKeys);
      this.validateField(w.bathroomWarm, 'SETTINGS.EXCEL_COLUMN_BATHROOM_WARM_NAME', 'Water', errors, fieldKeys, hintKeys);
      this.validateField(w.bathroomCold, 'SETTINGS.EXCEL_COLUMN_BATHROOM_COLD_NAME', 'Water', errors, fieldKeys, hintKeys);

      // Duplicate Check
      const waterColumns = [w.date, w.kitchenWarm, w.kitchenCold, w.bathroomWarm, w.bathroomCold]
        .filter(col => typeof col === 'string')
        .map(c => c.trim());
      const duplicates = waterColumns.filter((col, index) => waterColumns.indexOf(col) !== index);
      if (duplicates.length > 0) {
        const uniqueDupes = [...new Set(duplicates)];
        errors.push(this.languageService.translate('EXCEL.VALIDATION_DUPLICATES') + ` (Water): "${uniqueDupes.join('", "')}"`);
        hintKeys.push('EXCEL.VALIDATION_DUPLICATES_HINT');
      }
    }

    // 3. Heating Mapping Validation
    if (!hasHeatingMapping) {
      errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_MISSING_HEATING'));
      hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_HEATING_HINT');
    } else {
      const h = typedData.heatingMapping!;
      this.validateField(h.date, 'SETTINGS.EXCEL_COLUMN_DATE_NAME', 'Heating', errors, fieldKeys, hintKeys);

      // Validate rooms object
      if (h.rooms && typeof h.rooms === 'object') {
        const roomValues = Object.values(h.rooms);
        roomValues.forEach((value, index) => {
          if (typeof value === 'string') {
            this.validateField(value, `Room ${index + 1}`, 'Heating', errors, fieldKeys, hintKeys);
          }
        });

        // Duplicate Check for room column names
        const heatingColumns = [h.date, ...roomValues]
          .filter(col => typeof col === 'string')
          .map(c => c.trim());
        const duplicates = heatingColumns.filter((col, index) => heatingColumns.indexOf(col) !== index);
        if (duplicates.length > 0) {
          const uniqueDupes = [...new Set(duplicates)];
          errors.push(this.languageService.translate('EXCEL.VALIDATION_DUPLICATES') + ` (Heating): "${uniqueDupes.join('", "')}"`);
          hintKeys.push('EXCEL.VALIDATION_DUPLICATES_HINT');
        }
      }
    }

    if (errors.length > 0) {
      throw {
        message: this.languageService.translate('SETTINGS.VALIDATION_FAILED'),
        details: errors.join('\n'),
        fieldKeys,
        hintKeys
      } as ImportError;
    }

    // Return sanitized settings
    return {
      enabled: typedData.enabled ?? false,
      waterMapping: typedData.waterMapping as WaterColumnMapping,
      heatingMapping: typedData.heatingMapping as HeatingColumnMapping
    };
  }

  private validateField(value: unknown, fieldLabelKey: string, section: string, errors: string[], fieldKeys: string[], hintKeys: string[]) {
    const fieldName = this.languageService.translate(fieldLabelKey);

    if (typeof value !== 'string') {
      let typeError: string;
      if (value === null || value === undefined) {
        typeError = this.languageService.translate('EXCEL.VALIDATION_GOT_NULL');
      } else if (typeof value === 'boolean') {
        typeError = this.languageService.translate('EXCEL.VALIDATION_GOT_BOOLEAN');
      } else if (typeof value === 'number') {
        typeError = this.languageService.translate('EXCEL.VALIDATION_GOT_NUMBER');
      } else {
        typeError = this.languageService.translate('EXCEL.VALIDATION_MUST_BE_STRING');
      }

      errors.push(`${section} - ${fieldName}: ${typeError}`);
      fieldKeys.push(fieldLabelKey);
      hintKeys.push('EXCEL.VALIDATION_REQUIRED_HINT');
      return;
    }

    const errorMsg = this.validationService.getValidationError(value);
    if (errorMsg) {
      errors.push(`${section} - ${fieldName}: ${errorMsg}`);
      fieldKeys.push(fieldLabelKey);

      if (!value || value.trim() === '') {
        hintKeys.push('EXCEL.VALIDATION_REQUIRED_HINT');
      } else if (value.length > 255) {
        hintKeys.push('EXCEL.VALIDATION_TOO_LONG_HINT');
      } else if (value !== value.trim()) {
        hintKeys.push('EXCEL.VALIDATION_NO_WHITESPACE_HINT');
      } else if (/[\[\]\*\/\\\?\:]/.test(value)) {
        hintKeys.push('EXCEL.VALIDATION_INVALID_CHARS_HINT');
      } else {
        hintKeys.push('EXCEL.VALIDATION_REQUIRED_HINT');
      }
    }
  }


  /**
   * Map any error to UI-friendly error details
   */
  mapImportError(error: unknown): { message: string, details: string, instructions: string[] } {
    const err = error as ImportError;
    let message = '';
    let details = '';
    let instructions: string[] = [];

    if (err.message === 'invalid_file_type' || (err.error && err.error === 'invalid_file_type')) {
      message = 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE';
      instructions = [
        'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_1',
        'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_2'
      ];
    } else if (err.message === 'Failed to parse JSON file' || err.message === 'Failed to read file') {
      message = 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT';
      instructions = [
        'HOME.IMPORT_ERROR_INSTRUCTION_1',
        'HOME.IMPORT_ERROR_INSTRUCTION_2',
        'HOME.IMPORT_ERROR_INSTRUCTION_3'
      ];
    } else {
      message = err.message || 'SETTINGS.IMPORT_ERROR';
      details = err.details || '';

      if (err.hintKeys && Array.isArray(err.hintKeys) && err.hintKeys.length > 0) {
        const uniqueHints = [...new Set(err.hintKeys as string[])];
        instructions = uniqueHints;
      } else {
        instructions = [
          'HOME.IMPORT_ERROR_INSTRUCTION_1',
          'HOME.IMPORT_ERROR_INSTRUCTION_2',
          'HOME.IMPORT_ERROR_INSTRUCTION_3'
        ];
      }
    }

    return { message, details, instructions };
  }
}
