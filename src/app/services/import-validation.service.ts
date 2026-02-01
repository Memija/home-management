import { Injectable, inject } from '@angular/core';
import { ConsumptionRecord, DynamicHeatingRecord } from '../models/records.model';
import { LanguageService } from './language.service';

export interface ValidationResult<T> {
  validRecords: T[];
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ImportValidationService {
  private languageService = inject(LanguageService);

  /**
   * Validates JSON import data for water consumption records
   */
  validateWaterJsonImport(data: unknown[]): ValidationResult<ConsumptionRecord> {
    const validationErrors: string[] = [];
    const validRecords: ConsumptionRecord[] = [];
    const seenDates = new Map<string, number>();
    const numericFields = ['kitchenWarm', 'kitchenCold', 'bathroomWarm', 'bathroomCold'];

    for (let index = 0; index < data.length; index++) {
      const record = data[index] as Record<string, unknown>;
      const rowNumber = index + 1;

      // Validate record structure and date
      const dateResult = this.validateRecordAndDate(record, rowNumber, seenDates);
      if (!dateResult.valid) {
        validationErrors.push(...dateResult.errors);
        continue;
      }

      // Validate numeric fields
      const numericResult = this.validateNumericFields(record, rowNumber, numericFields);
      if (numericResult.errors.length > 0) {
        validationErrors.push(...numericResult.errors);
        continue;
      }

      validRecords.push({
        date: dateResult.date!,
        kitchenWarm: numericResult.values['kitchenWarm'],
        kitchenCold: numericResult.values['kitchenCold'],
        bathroomWarm: numericResult.values['bathroomWarm'],
        bathroomCold: numericResult.values['bathroomCold']
      });
    }

    return { validRecords, errors: validationErrors };
  }

  /**
   * Validates JSON import data for heating consumption records (Dynamic format)
   */
  validateHeatingJsonImport(data: unknown[], expectedRoomIds?: string[]): ValidationResult<DynamicHeatingRecord> {
    const validationErrors: string[] = [];
    const validRecords: { date: Date; rooms: Record<string, number> }[] = [];
    const seenDates = new Map<string, number>();

    for (let index = 0; index < data.length; index++) {
      const record = data[index] as Record<string, unknown>;
      const rowNumber = index + 1;

      // Validate record structure and date
      const dateResult = this.validateRecordAndDate(record, rowNumber, seenDates);
      if (!dateResult.valid) {
        validationErrors.push(...dateResult.errors);
        continue;
      }

      // Format date for error messages
      const dateStr = this.formatLocalDate(dateResult.date!);

      // Validate 'rooms' object
      if (!record['rooms'] || typeof record['rooms'] !== 'object') {
        validationErrors.push(this.languageService.translate('ERROR.IMPORT_MISSING_ROOMS_OBJECT', { date: dateStr }));
        continue;
      }

      const rooms = record['rooms'] as Record<string, unknown>;
      const validRooms: Record<string, number> = {};
      let hasRoomsError = false;

      // Strict validation against expected room IDs
      if (expectedRoomIds && expectedRoomIds.length > 0) {
        const recordRoomKeys = Object.keys(rooms);

        // Check for missing rooms
        for (const expectedId of expectedRoomIds) {
          if (!recordRoomKeys.includes(expectedId)) {
            validationErrors.push(this.languageService.translate('ERROR.IMPORT_MISSING_ROOM_DATA', { date: dateStr, room: expectedId }));
            hasRoomsError = true;
          }
        }

        // Check for unknown rooms
        for (const key of recordRoomKeys) {
          if (!expectedRoomIds.includes(key)) {
            validationErrors.push(this.languageService.translate('ERROR.IMPORT_UNKNOWN_ROOM', { date: dateStr, room: key }));
            hasRoomsError = true;
          }
        }
      }

      if (hasRoomsError) continue;

      for (const [roomId, value] of Object.entries(rooms)) {
        if (typeof value === 'number' && !isNaN(value)) {
          validRooms[roomId] = value;
        } else if (typeof value === 'string') {
          const num = Number(value);
          if (isNaN(num)) {
            validationErrors.push(this.languageService.translate('ERROR.IMPORT_INVALID_ROOM_VALUE', { date: dateStr, value: value, room: roomId }));
            hasRoomsError = true;
          } else {
            validRooms[roomId] = num;
          }
        } else if (value === null || value === undefined) {
          validRooms[roomId] = 0;
        } else {
          validationErrors.push(this.languageService.translate('ERROR.IMPORT_INVALID_ROOM_TYPE', { date: dateStr, room: roomId }));
          hasRoomsError = true;
        }
      }

      if (hasRoomsError) continue;

      validRecords.push({
        date: dateResult.date!,
        rooms: validRooms
      });
    }

    return { validRecords, errors: validationErrors };
  }

  /**
   * Validates JSON import data for electricity consumption records
   */
  validateElectricityJsonImport(data: unknown[]): ValidationResult<import('../models/records.model').ElectricityRecord> {
    const validationErrors: string[] = [];
    const validRecords: import('../models/records.model').ElectricityRecord[] = [];
    const seenDates = new Map<string, number>();
    const numericFields = ['value'];

    for (let index = 0; index < data.length; index++) {
      const record = data[index] as Record<string, unknown>;
      const rowNumber = index + 1;

      // Validate record structure and date
      const dateResult = this.validateRecordAndDate(record, rowNumber, seenDates);
      if (!dateResult.valid) {
        validationErrors.push(...dateResult.errors);
        continue;
      }

      // Validate numeric fields
      const numericResult = this.validateNumericFields(record, rowNumber, numericFields);
      if (numericResult.errors.length > 0) {
        validationErrors.push(...numericResult.errors);
        continue;
      }

      validRecords.push({
        date: dateResult.date!,
        value: numericResult.values['value']
      });
    }

    return { validRecords, errors: validationErrors };
  }


  /**
   * Gets error instructions for JSON import errors
   */
  getJsonErrorInstructions(errorMessage: string): string[] {
    const instructions: string[] = [];

    if (errorMessage.includes('INVALID_DATE') || errorMessage.includes('MISSING_DATE') || errorMessage.includes('INVALID_RECORD')) {
      instructions.push('ERROR.JSON_DATE_FIX_1', 'ERROR.JSON_DATE_FIX_2');
    }
    if (errorMessage.includes('INVALID_NUMBER') || errorMessage.includes('INVALID_FIELD_TYPE')) {
      instructions.push('ERROR.JSON_NUMBER_FIX_1', 'ERROR.JSON_NUMBER_FIX_2');
    }
    if (errorMessage.includes('DUPLICATE_DATE')) {
      instructions.push('ERROR.JSON_DUPLICATE_FIX_1', 'ERROR.JSON_DUPLICATE_FIX_2');
    }

    if (instructions.length === 0) {
      instructions.push(
        'HOME.IMPORT_ERROR_INSTRUCTION_1',
        'HOME.IMPORT_ERROR_INSTRUCTION_2',
        'HOME.IMPORT_ERROR_INSTRUCTION_3'
      );
    }

    return instructions;
  }

  /**
   * Gets error instructions for Excel import errors
   */
  getExcelErrorInstructions(errorMessage: string): string[] {
    const instructions: string[] = [];

    if (errorMessage.includes('INVALID_DATE') || errorMessage.includes('MISSING_DATE')) {
      instructions.push('ERROR.EXCEL_DATE_FIX_1', 'ERROR.EXCEL_DATE_FIX_2', 'ERROR.EXCEL_DATE_FIX_3');
    }
    if (errorMessage.includes('INVALID_NUMBER') || errorMessage.includes('INVALID_FIELD_TYPE')) {
      instructions.push('ERROR.EXCEL_NUMBER_FIX_1', 'ERROR.EXCEL_NUMBER_FIX_2');
    }
    if (errorMessage.includes('DUPLICATE_DATE')) {
      instructions.push('ERROR.EXCEL_DUPLICATE_FIX_1', 'ERROR.EXCEL_DUPLICATE_FIX_2');
    }
    if (errorMessage.includes('MISSING_REQUIRED') || errorMessage.includes('COLUMN_FIX')) {
      instructions.push('ERROR.EXCEL_COLUMN_FIX_1', 'ERROR.EXCEL_COLUMN_FIX_2');
    }

    if (instructions.length === 0) {
      instructions.push('ERROR.EXCEL_GENERIC_FIX_1', 'ERROR.EXCEL_GENERIC_FIX_2');
    }

    return instructions;
  }

  /**
   * Validates that data is a non-empty array
   */
  validateDataArray(data: unknown): string | null {
    if (!Array.isArray(data)) {
      return this.languageService.translate('ERROR.IMPORT_INVALID_DATA_FORMAT');
    }
    if (data.length === 0) {
      return this.languageService.translate('ERROR.IMPORT_EMPTY_FILE');
    }
    return null;
  }

  // Private helper methods

  private validateRecordAndDate(
    record: unknown,
    rowNumber: number,
    seenDates: Map<string, number>
  ): { valid: boolean; date?: Date; errors: string[] } {
    const errors: string[] = [];

    // Check record is an object
    if (!record || typeof record !== 'object') {
      errors.push(this.languageService.translate('ERROR.IMPORT_INVALID_RECORD_FORMAT', { row: rowNumber }));
      return { valid: false, errors };
    }

    const rec = record as Record<string, unknown>;

    // Check required date field exists
    if (!('date' in rec)) {
      errors.push(this.languageService.translate('ERROR.IMPORT_MISSING_DATE_FIELD', { row: rowNumber }));
      return { valid: false, errors };
    }

    // Parse and validate date
    const dateValue = rec['date'];
    let parsedDate: Date | null = null;

    if (typeof dateValue === 'string') {
      parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) {
        errors.push(this.languageService.translate('ERROR.IMPORT_INVALID_DATE_VALUE', { row: rowNumber, value: dateValue }));
        return { valid: false, errors };
      }
    } else if (dateValue instanceof Date) {
      parsedDate = dateValue;
    } else {
      errors.push(this.languageService.translate('ERROR.IMPORT_INVALID_DATE_TYPE', { row: rowNumber }));
      return { valid: false, errors };
    }

    // Check for duplicate dates (use local date to match display)
    const dateKey = this.formatLocalDate(parsedDate);
    if (seenDates.has(dateKey)) {
      errors.push(this.languageService.translate('ERROR.IMPORT_DUPLICATE_DATE', { row: rowNumber, date: dateKey, firstRow: seenDates.get(dateKey) || 0 }));
      return { valid: false, errors };
    }
    seenDates.set(dateKey, rowNumber);

    return { valid: true, date: parsedDate, errors: [] };
  }

  private validateNumericFields(
    record: Record<string, unknown>,
    rowNumber: number,
    fields: string[]
  ): { values: Record<string, number>; errors: string[] } {
    const errors: string[] = [];
    const values: Record<string, number> = {};

    for (const field of fields) {
      const value = record[field];
      if (value === undefined || value === null || value === '') {
        values[field] = 0; // Default to 0 for missing
      } else if (typeof value === 'number' && !isNaN(value)) {
        values[field] = value;
      } else if (typeof value === 'string') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(this.languageService.translate('ERROR.IMPORT_INVALID_NUMBER_VALUE', { row: rowNumber, value: value, field: field }));
        } else {
          values[field] = num;
        }
      } else {
        errors.push(this.languageService.translate('ERROR.IMPORT_INVALID_FIELD_TYPE', { row: rowNumber, field: field }));
      }
    }

    return { values, errors };
  }

  private formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
