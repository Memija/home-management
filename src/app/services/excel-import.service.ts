import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';
import { ExcelValidationService } from './excel-validation.service';
import {
  ExcelSettings,
  WaterColumnMapping,
  HeatingColumnMapping,
  ElectricityColumnMapping,
} from './excel-settings.service';
import { HeatingRoomsService } from './heating-rooms.service';

export interface ImportErrorInit {
  message: string;
  details?: string;
  fieldKeys?: string[];
  hintKeys?: string[];
  error?: string;
}

export class ImportError extends Error {
  details?: string;
  fieldKeys?: string[];
  hintKeys?: string[];
  error?: string;

  constructor(init: ImportErrorInit) {
    super(init.message);
    this.name = 'ImportError';
    this.details = init.details;
    this.fieldKeys = init.fieldKeys;
    this.hintKeys = init.hintKeys;
    this.error = init.error;
    Object.setPrototypeOf(this, ImportError.prototype);
  }
}

interface RawSettings {
  enabled?: boolean;
  waterMapping?: Partial<WaterColumnMapping>;
  heatingMapping?: Partial<HeatingColumnMapping>;
  electricityMapping?: Partial<ElectricityColumnMapping>;
}

interface ValidationContext {
  errors: string[];
  fieldKeys: string[];
  hintKeys: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ExcelImportService {
  private readonly languageService = inject(LanguageService);
  private readonly validationService = inject(ExcelValidationService);
  private readonly heatingRoomsService = inject(HeatingRoomsService);

  /**
   * Validate imported settings data structure and content
   * Throws an ImportError if invalid
   */
  validateImportedSettings(data: unknown): ExcelSettings {
    const ctx: ValidationContext = {
      errors: [],
      fieldKeys: [],
      hintKeys: [],
    };

    // 1. Structure Check
    if (!data || typeof data !== 'object') {
      throw new ImportError({ message: 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT' });
    }

    const typedData = data as RawSettings;
    const hasEnabled = 'enabled' in typedData;
    const hasWaterMapping =
      'waterMapping' in typedData &&
      Boolean(typedData.waterMapping) &&
      typeof typedData.waterMapping === 'object';
    const hasHeatingMapping =
      'heatingMapping' in typedData &&
      Boolean(typedData.heatingMapping) &&
      typeof typedData.heatingMapping === 'object';

    // If none of the expected fields exist
    if (!hasEnabled && !hasWaterMapping && !hasHeatingMapping) {
      throw new ImportError({ message: 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT' });
    }

    // Validation
    if (!hasEnabled || typeof typedData.enabled !== 'boolean') {
      ctx.errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_INVALID_ENABLED'));
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_INVALID_ENABLED_HINT');
    }

    this.validateWaterMappingSection(typedData.waterMapping, ctx);
    this.validateHeatingMappingSection(typedData.heatingMapping, ctx);

    if (hasWaterMapping && hasHeatingMapping) {
      this.validateCrossSectionDuplicates(typedData.waterMapping!, typedData.heatingMapping!, ctx);
    }

    const electricityMapping = this.validateElectricityMappingSection(
      typedData.electricityMapping,
      ctx,
    );

    if (ctx.errors.length > 0) {
      throw new ImportError({
        message: this.languageService.translate('SETTINGS.VALIDATION_FAILED'),
        details: ctx.errors.join('\n'),
        fieldKeys: ctx.fieldKeys,
        hintKeys: ctx.hintKeys,
      });
    }

    // Return sanitized settings
    return {
      enabled: typedData.enabled ?? false,
      waterMapping: typedData.waterMapping as WaterColumnMapping,
      heatingMapping: typedData.heatingMapping as HeatingColumnMapping,
      electricityMapping,
    };
  }

  private validateWaterMappingSection(
    waterMapping: Partial<WaterColumnMapping> | undefined,
    ctx: ValidationContext,
  ): void {
    if (!waterMapping || typeof waterMapping !== 'object') {
      ctx.errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_MISSING_WATER'));
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_WATER_HINT');
      return;
    }

    this.validateField(
      waterMapping.date,
      'SETTINGS.EXCEL_COLUMN_DATE_NAME',
      'Water',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );
    this.validateField(
      waterMapping.kitchenWarm,
      'SETTINGS.EXCEL_COLUMN_KITCHEN_WARM_NAME',
      'Water',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );
    this.validateField(
      waterMapping.kitchenCold,
      'SETTINGS.EXCEL_COLUMN_KITCHEN_COLD_NAME',
      'Water',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );
    this.validateField(
      waterMapping.bathroomWarm,
      'SETTINGS.EXCEL_COLUMN_BATHROOM_WARM_NAME',
      'Water',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );
    this.validateField(
      waterMapping.bathroomCold,
      'SETTINGS.EXCEL_COLUMN_BATHROOM_COLD_NAME',
      'Water',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );

    const waterColumns = [
      waterMapping.date,
      waterMapping.kitchenWarm,
      waterMapping.kitchenCold,
      waterMapping.bathroomWarm,
      waterMapping.bathroomCold,
    ]
      .filter((col) => typeof col === 'string')
      .map((c) => c.trim());
    const duplicates = waterColumns.filter((col, index) => waterColumns.indexOf(col) !== index);
    if (duplicates.length > 0) {
      const uniqueDupes = [...new Set(duplicates)];
      ctx.errors.push(
        this.languageService.translate('EXCEL.VALIDATION_DUPLICATES') +
          ` (Water): "${uniqueDupes.join('", "')}"`,
      );
      ctx.hintKeys.push('EXCEL.VALIDATION_DUPLICATES_HINT');
    }
  }

  private validateHeatingMappingSection(
    heatingMapping: Partial<HeatingColumnMapping> | undefined,
    ctx: ValidationContext,
  ): void {
    if (!heatingMapping || typeof heatingMapping !== 'object') {
      ctx.errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_MISSING_HEATING'));
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_HEATING_HINT');
      return;
    }

    this.validateField(
      heatingMapping.date,
      'SETTINGS.EXCEL_COLUMN_DATE_NAME',
      'Heating',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );

    if (!heatingMapping.rooms || typeof heatingMapping.rooms !== 'object') {
      ctx.errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_MISSING_ROOMS'));
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_ROOMS_HINT');
    } else {
      this.validateHeatingRooms(heatingMapping.rooms, heatingMapping.date, ctx);
    }

    const allowedHeatingFields = new Set(['date', 'rooms']);
    const unexpectedFields = Object.keys(heatingMapping).filter(
      (key) => !allowedHeatingFields.has(key),
    );
    if (unexpectedFields.length > 0) {
      ctx.errors.push(
        this.languageService
          .translate('SETTINGS.IMPORT_EXCEL_UNEXPECTED_FIELDS')
          .replace('{{fields}}', unexpectedFields.join(', ')),
      );
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_UNEXPECTED_FIELDS_HINT');
    }
  }

  private validateHeatingRooms(
    rooms: Record<string, unknown>,
    heatingDate: string | undefined,
    ctx: ValidationContext,
  ): void {
    const roomEntries = Object.entries(rooms);

    if (roomEntries.length === 0) {
      ctx.errors.push(this.languageService.translate('SETTINGS.IMPORT_EXCEL_EMPTY_ROOMS'));
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_EMPTY_ROOMS_HINT');
      return;
    }

    const configuredRooms = this.heatingRoomsService.rooms();
    const configuredRoomIds = configuredRooms.map((r) => r.id);
    const configuredRoomIdSet = new Set(configuredRoomIds);
    const importedRoomIds = roomEntries.map(([id]) => id);
    const importedRoomIdSet = new Set(importedRoomIds);

    const extraRoomIds = importedRoomIds.filter((id) => !configuredRoomIdSet.has(id));
    if (extraRoomIds.length > 0) {
      ctx.errors.push(
        this.languageService
          .translate('SETTINGS.IMPORT_EXCEL_UNKNOWN_ROOMS')
          .replace('{{rooms}}', extraRoomIds.join(', ')),
      );
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_UNKNOWN_ROOMS_HINT');
    }

    const missingRoomIds = configuredRoomIds.filter((id) => !importedRoomIdSet.has(id));
    if (missingRoomIds.length > 0) {
      const missingRoomNames = missingRoomIds.map((id) => {
        const room = configuredRooms.find((r) => r.id === id);
        return room ? room.name : id;
      });
      ctx.errors.push(
        this.languageService
          .translate('SETTINGS.IMPORT_EXCEL_MISSING_ROOM_MAPPINGS')
          .replace('{{rooms}}', missingRoomNames.join(', ')),
      );
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_MISSING_ROOM_MAPPINGS_HINT');
    }

    roomEntries.forEach(([roomId, value]) => {
      if (typeof value === 'string') {
        this.validateField(
          value,
          `Room "${roomId}"`,
          'Heating',
          ctx.errors,
          ctx.fieldKeys,
          ctx.hintKeys,
        );
      } else {
        ctx.errors.push(
          `Heating - Room "${roomId}": ${this.languageService.translate('EXCEL.VALIDATION_MUST_BE_STRING')}`,
        );
        ctx.hintKeys.push('EXCEL.VALIDATION_REQUIRED_HINT');
      }
    });

    const roomValues = roomEntries
      .map(([, v]) => v)
      .filter((v) => typeof v === 'string') as string[];
    const heatingColumns = [heatingDate, ...roomValues]
      .filter((col) => typeof col === 'string')
      .map((c) => c.trim());
    const duplicates = heatingColumns.filter((col, index) => heatingColumns.indexOf(col) !== index);
    if (duplicates.length > 0) {
      const uniqueDupes = [...new Set(duplicates)];
      ctx.errors.push(
        this.languageService.translate('EXCEL.VALIDATION_DUPLICATES') +
          ` (Heating): "${uniqueDupes.join('", "')}"`,
      );
      ctx.hintKeys.push('EXCEL.VALIDATION_DUPLICATES_HINT');
    }
  }

  private validateCrossSectionDuplicates(
    w: Partial<WaterColumnMapping>,
    h: Partial<HeatingColumnMapping>,
    ctx: ValidationContext,
  ): void {
    const waterColumns = [w.date, w.kitchenWarm, w.kitchenCold, w.bathroomWarm, w.bathroomCold]
      .filter((col) => typeof col === 'string')
      .map((c) => c.trim().toLowerCase());

    const heatingColumnsSet = new Set(
      [h.date, ...(h.rooms ? Object.values(h.rooms) : [])]
        .filter((col) => typeof col === 'string')
        .map((c) => c.trim().toLowerCase()),
    );

    const crossDuplicates = waterColumns.filter((col) => col && heatingColumnsSet.has(col));
    if (crossDuplicates.length > 0) {
      const uniqueCrossDupes = [...new Set(crossDuplicates)];
      ctx.errors.push(
        this.languageService
          .translate('SETTINGS.IMPORT_EXCEL_CROSS_SECTION_DUPLICATES')
          .replace('{{columns}}', `"${uniqueCrossDupes.join('", "')}"`),
      );
      ctx.hintKeys.push('SETTINGS.IMPORT_EXCEL_CROSS_SECTION_DUPLICATES_HINT');
    }
  }

  private validateElectricityMappingSection(
    electricityMapping: Partial<ElectricityColumnMapping> | undefined,
    ctx: ValidationContext,
  ): ElectricityColumnMapping {
    if (!electricityMapping || typeof electricityMapping !== 'object') {
      return {
        date: 'Date',
        value: 'Electricity Consumption (kWh)',
      };
    }

    this.validateField(
      electricityMapping.date,
      'SETTINGS.EXCEL_COLUMN_DATE_NAME',
      'Electricity',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );
    this.validateField(
      electricityMapping.value,
      'SETTINGS.EXCEL_COLUMN_ELECTRICITY_VALUE_NAME',
      'Electricity',
      ctx.errors,
      ctx.fieldKeys,
      ctx.hintKeys,
    );

    const electricityColumns = [electricityMapping.date, electricityMapping.value]
      .filter((col) => typeof col === 'string')
      .map((c) => c.trim());

    const duplicates = electricityColumns.filter(
      (col, index) => electricityColumns.indexOf(col) !== index,
    );
    if (duplicates.length > 0) {
      const uniqueDupes = [...new Set(duplicates)];
      ctx.errors.push(
        this.languageService.translate('EXCEL.VALIDATION_DUPLICATES') +
          ` (Electricity): "${uniqueDupes.join('", "')}"`,
      );
      ctx.hintKeys.push('EXCEL.VALIDATION_DUPLICATES_HINT');
    }

    return electricityMapping as ElectricityColumnMapping;
  }

  private validateField(
    value: unknown,
    fieldLabelKey: string,
    section: string,
    errors: string[],
    fieldKeys: string[],
    hintKeys: string[],
  ) {
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
      } else if (/[[\]*/\\?:]/.test(value)) {
        hintKeys.push('EXCEL.VALIDATION_INVALID_CHARS_HINT');
      } else {
        hintKeys.push('EXCEL.VALIDATION_REQUIRED_HINT');
      }
    }
  }

  /**
   * Map any error to UI-friendly error details
   */
  mapImportError(error: unknown): { message: string; details: string; instructions: string[] } {
    const err = error as ImportError;

    let message: string;
    let details = '';
    let instructions: string[];

    if (err.message === 'invalid_file_type' || (err.error && err.error === 'invalid_file_type')) {
      message = 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE';
      instructions = [
        'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_1',
        'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_2',
      ];
    } else if (
      err.message === 'Failed to parse JSON file' ||
      err.message === 'Failed to read file'
    ) {
      message = 'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FORMAT';
      instructions = [
        'HOME.IMPORT_ERROR_INSTRUCTION_1',
        'HOME.IMPORT_ERROR_INSTRUCTION_2',
        'HOME.IMPORT_ERROR_INSTRUCTION_3',
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
          'HOME.IMPORT_ERROR_INSTRUCTION_3',
        ];
      }
    }

    return { message, details, instructions };
  }
}
