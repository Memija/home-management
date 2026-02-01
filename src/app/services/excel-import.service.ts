import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';
import { ExcelValidationService } from './excel-validation.service';
import { ExcelSettings, WaterColumnMapping, HeatingColumnMapping, ElectricityColumnMapping } from './excel-settings.service';
import { HeatingRoomsService } from './heating-rooms.service';

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
  private heatingRoomsService = inject(HeatingRoomsService);

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
      electricityMapping?: Partial<ElectricityColumnMapping>;
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

      // Require the 'rooms' object format (reject legacy fixed-field format)
      if (!h.rooms || typeof h.rooms !== 'object') {
        errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_MISSING_ROOMS'));
        hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_ROOMS_HINT');
      } else {
        const roomEntries = Object.entries(h.rooms);

        // Check that rooms object is not empty
        if (roomEntries.length === 0) {
          errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_EMPTY_ROOMS'));
          hintKeys.push('SETTINGS.IMPORT_EXCEL_EMPTY_ROOMS_HINT');
        }

        // Validate that imported room IDs match currently configured rooms
        const configuredRooms = this.heatingRoomsService.rooms();
        const configuredRoomIds = configuredRooms.map(r => r.id);
        const importedRoomIds = roomEntries.map(([id]) => id);

        // Check for extra rooms in import (rooms that don't exist in config)
        const extraRoomIds = importedRoomIds.filter(id => !configuredRoomIds.includes(id));
        if (extraRoomIds.length > 0) {
          errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_UNKNOWN_ROOMS').replace('{{rooms}}', extraRoomIds.join(', ')));
          hintKeys.push('SETTINGS.IMPORT_EXCEL_UNKNOWN_ROOMS_HINT');
        }

        // Check for missing rooms in import (configured rooms not in import)
        const missingRoomIds = configuredRoomIds.filter(id => !importedRoomIds.includes(id));
        if (missingRoomIds.length > 0) {
          const missingRoomNames = missingRoomIds.map(id => {
            const room = configuredRooms.find(r => r.id === id);
            return room ? room.name : id;
          });
          errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_MISSING_ROOM_MAPPINGS').replace('{{rooms}}', missingRoomNames.join(', ')));
          hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_ROOM_MAPPINGS_HINT');
        }

        // Validate each room entry
        roomEntries.forEach(([roomId, value], index) => {
          if (typeof value === 'string') {
            this.validateField(value, `Room "${roomId}"`, 'Heating', errors, fieldKeys, hintKeys);
          } else {
            errors.push(`Heating - Room "${roomId}": ${this.languageService.translate('EXCEL.VALIDATION_MUST_BE_STRING')}`);
            hintKeys.push('EXCEL.VALIDATION_REQUIRED_HINT');
          }
        });

        // Duplicate Check for room column names
        const roomValues = roomEntries.map(([, v]) => v).filter(v => typeof v === 'string') as string[];
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

      // Warn about unexpected/legacy fields in heatingMapping
      const allowedHeatingFields = ['date', 'rooms'];
      const unexpectedFields = Object.keys(h).filter(key => !allowedHeatingFields.includes(key));
      if (unexpectedFields.length > 0) {
        errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_UNEXPECTED_FIELDS').replace('{{fields}}', unexpectedFields.join(', ')));
        hintKeys.push('SETTINGS.IMPORT_EXCEL_UNEXPECTED_FIELDS_HINT');
      }
    }

    // 4. Cross-Section Duplicate Check
    if (hasWaterMapping && hasHeatingMapping) {
      const w = typedData.waterMapping!;
      const h = typedData.heatingMapping!;

      const waterColumns = [w.date, w.kitchenWarm, w.kitchenCold, w.bathroomWarm, w.bathroomCold]
        .filter(col => typeof col === 'string')
        .map(c => c.trim().toLowerCase());

      const heatingColumnsArr = [h.date, ...(h.rooms ? Object.values(h.rooms) : [])]
        .filter(col => typeof col === 'string')
        .map(c => c.trim().toLowerCase());

      const crossDuplicates = waterColumns.filter(col => col && heatingColumnsArr.includes(col));
      if (crossDuplicates.length > 0) {
        const uniqueCrossDupes = [...new Set(crossDuplicates)];
        errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_CROSS_SECTION_DUPLICATES').replace('{{columns}}', `"${uniqueCrossDupes.join('", "')}"`));
        hintKeys.push('SETTINGS.IMPORT_EXCEL_CROSS_SECTION_DUPLICATES_HINT');
      }
    }

    // 4. Electricity Mapping Validation (Optional for backward compatibility, but required for return type)
    const hasElectricityMapping = 'electricityMapping' in typedData && typedData.electricityMapping && typeof typedData.electricityMapping === 'object';
    let electricityMapping: ElectricityColumnMapping;

    if (hasElectricityMapping) {
      const e = typedData.electricityMapping!;
      this.validateField(e.date, 'SETTINGS.EXCEL_COLUMN_DATE_NAME', 'Electricity', errors, fieldKeys, hintKeys);
      this.validateField(e.value, 'SETTINGS.EXCEL_COLUMN_ELECTRICITY_VALUE_NAME', 'Electricity', errors, fieldKeys, hintKeys);

      electricityMapping = e as ElectricityColumnMapping;

      // Duplicate Check
      const electricityColumns = [e.date, e.value]
        .filter(col => typeof col === 'string')
        .map(c => c.trim());

      const duplicates = electricityColumns.filter((col, index) => electricityColumns.indexOf(col) !== index);
      if (duplicates.length > 0) {
        const uniqueDupes = [...new Set(duplicates)];
        errors.push(this.languageService.translate('EXCEL.VALIDATION_DUPLICATES') + ` (Electricity): "${uniqueDupes.join('", "')}"`);
        hintKeys.push('EXCEL.VALIDATION_DUPLICATES_HINT');
      }
    } else {
      // Default fallback if missing (e.g. importing old settings)
      electricityMapping = {
        date: 'Date',
        value: 'Electricity Consumption (kWh)'
      };
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
      heatingMapping: typedData.heatingMapping as HeatingColumnMapping,
      electricityMapping
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
