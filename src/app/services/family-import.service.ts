import { Injectable, inject } from '@angular/core';
import { HouseholdService, HouseholdMember } from './household.service';
import { LanguageService } from './language.service';
import { FileStorageService } from './file-storage.service';

export interface MemberValidationResult {
  valid: boolean;
  members?: HouseholdMember[];
  errors?: string[];
}

export interface FamilyImportResult {
  success: boolean;
  members?: HouseholdMember[];
  errorMessage?: string;
  errorInstructions?: string[];
}

/**
 * Service for validating and importing family member data.
 * Extracted from FamilyComponent for reusability.
 */
@Injectable({
  providedIn: 'root'
})
export class FamilyImportService {
  private householdService = inject(HouseholdService);
  private languageService = inject(LanguageService);
  private fileStorage = inject(FileStorageService);

  /**
   * Import family data from a file with validation.
   * Returns a result object with members on success or error info on failure.
   */
  async importFromFile(): Promise<FamilyImportResult> {
    const result = await this.fileStorage.importData<HouseholdMember[]>(true);

    // User cancelled
    if (result === null) {
      return { success: false };
    }

    // Handle file errors
    if ('error' in result) {
      if (result.error === 'invalid_file_type') {
        return {
          success: false,
          errorMessage: this.languageService.translate('SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE'),
          errorInstructions: [
            'SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE_INSTRUCTION_1',
            'SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE_INSTRUCTION_2'
          ]
        };
      } else {
        return {
          success: false,
          errorMessage: this.languageService.translate('HOME.IMPORT_INVALID_FORMAT'),
          errorInstructions: [
            'HOME.IMPORT_ERROR_INSTRUCTION_1',
            'HOME.IMPORT_ERROR_INSTRUCTION_2',
            'HOME.IMPORT_ERROR_INSTRUCTION_3'
          ]
        };
      }
    }

    // Validate data structure
    if (!Array.isArray(result.data)) {
      return {
        success: false,
        errorMessage: this.languageService.translate('HOME.IMPORT_INVALID_DATA'),
        errorInstructions: [
          'HOME.IMPORT_ERROR_INSTRUCTION_1',
          'HOME.IMPORT_ERROR_INSTRUCTION_2',
          'HOME.IMPORT_ERROR_INSTRUCTION_3'
        ]
      };
    }

    // Validate each member
    const validationResult = this.validateImportedMembers(result.data);
    if (!validationResult.valid) {
      return {
        success: false,
        errorMessage: this.languageService.translate('SETTINGS.IMPORT_FAMILY_INVALID_DATA'),
        errorInstructions: validationResult.errors
      };
    }

    return { success: true, members: validationResult.members };
  }

  /**
   * Validates imported member data and returns sanitized members or errors.
   */
  validateImportedMembers(data: any[]): MemberValidationResult {
    const errors: string[] = [];
    const validatedMembers: HouseholdMember[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let hasErrors = false;

      // Check if item is an object
      if (!item || typeof item !== 'object') {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_NOT_OBJECT');
        continue;
      }

      // Validate required string fields
      if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_NAME');
        hasErrors = true;
      }
      if (!item.surname || typeof item.surname !== 'string' || item.surname.trim() === '') {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_SURNAME');
        hasErrors = true;
      }

      // Validate type (required - must be adult, kid, or other)
      if (!item.type || (item.type !== 'adult' && item.type !== 'kid' && item.type !== 'other')) {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_TYPE');
        hasErrors = true;
      }

      // Validate gender (required - must be male, female, or other)
      if (!item.gender || (item.gender !== 'male' && item.gender !== 'female' && item.gender !== 'other')) {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_GENDER');
        hasErrors = true;
      }

      // Skip this record if it has validation errors
      if (hasErrors) {
        continue;
      }

      // Validate and sanitize avatar - accept known avatars or data URLs, otherwise use default
      let validAvatar: string;
      if (item.avatar && typeof item.avatar === 'string') {
        const isKnownAvatar = this.householdService.avatars.includes(item.avatar);
        const isDataUrl = item.avatar.startsWith('data:image/');
        validAvatar = (isKnownAvatar || isDataUrl)
          ? item.avatar
          : this.householdService.avatars[Math.floor(Math.random() * this.householdService.avatars.length)];
      } else {
        validAvatar = this.householdService.avatars[Math.floor(Math.random() * this.householdService.avatars.length)];
      }

      // Create validated member with generated ID if missing
      validatedMembers.push({
        id: (item.id && typeof item.id === 'string') ? item.id : crypto.randomUUID(),
        name: item.name.trim(),
        surname: item.surname.trim(),
        type: item.type,
        gender: item.gender,
        avatar: validAvatar
      });
    }

    // Remove duplicate errors and keep unique ones
    const uniqueErrors = [...new Set(errors)];

    if (uniqueErrors.length > 0) {
      return { valid: false, errors: uniqueErrors };
    }

    if (validatedMembers.length === 0 && data.length > 0) {
      return { valid: false, errors: ['SETTINGS.IMPORT_FAMILY_ERROR_NO_VALID_MEMBERS'] };
    }

    return { valid: true, members: validatedMembers };
  }

  /**
   * Export family members to a file.
   */
  async exportMembers(members: HouseholdMember[]): Promise<void> {
    // Ensure type and gender are always set (use 'other' as default for undefined)
    const exportMembers = members.map(m => ({
      ...m,
      type: m.type || 'other',
      gender: m.gender || 'other'
    }));
    await this.fileStorage.exportData(exportMembers, 'family.json');
  }
}
