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
  providedIn: 'root',
})
export class FamilyImportService {
  private readonly householdService = inject(HouseholdService);
  private readonly languageService = inject(LanguageService);
  private readonly fileStorage = inject(FileStorageService);

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
            'SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE_INSTRUCTION_2',
          ],
        };
      } else {
        return {
          success: false,
          errorMessage: this.languageService.translate('HOME.IMPORT_INVALID_FORMAT'),
          errorInstructions: [
            'HOME.IMPORT_ERROR_INSTRUCTION_1',
            'HOME.IMPORT_ERROR_INSTRUCTION_2',
            'HOME.IMPORT_ERROR_INSTRUCTION_3',
          ],
        };
      }
    }

    // Validate data structure
    if (!Array.isArray(result.data)) {
      return {
        success: false,
        errorMessage: this.languageService.translate('SETTINGS.IMPORT_FAMILY_INVALID_FORMAT'),
        errorInstructions: [
          'HOME.IMPORT_ERROR_INSTRUCTION_1',
          'HOME.IMPORT_ERROR_INSTRUCTION_2',
          'HOME.IMPORT_ERROR_INSTRUCTION_3',
        ],
      };
    }

    // Validate each member
    const validationResult = this.validateImportedMembers(result.data);
    if (!validationResult.valid) {
      return {
        success: false,
        errorMessage: this.languageService.translate('SETTINGS.IMPORT_FAMILY_INVALID_DATA'),
        errorInstructions: validationResult.errors,
      };
    }

    return { success: true, members: validationResult.members };
  }

  /**
   * Validates imported member data and returns sanitized members or errors.
   */
  validateImportedMembers(data: unknown[]): MemberValidationResult {
    const errors: string[] = [];
    const validatedMembers: HouseholdMember[] = [];

    for (const rawItem of data) {
      const member = this.validateMemberItem(rawItem, errors);
      if (member) {
        validatedMembers.push(member);
      }
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

  private validateMemberItem(item: unknown, errors: string[]): HouseholdMember | null {
    if (!item || typeof item !== 'object') {
      errors.push('SETTINGS.IMPORT_FAMILY_ERROR_NOT_OBJECT');
      return null;
    }

    interface RawMember {
      id?: unknown;
      name?: unknown;
      surname?: unknown;
      type?: unknown;
      gender?: unknown;
      avatar?: unknown;
    }

    const raw = item as RawMember;
    let hasErrors = false;

    if (!raw.name || typeof raw.name !== 'string' || raw.name.trim() === '') {
      errors.push('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_NAME');
      hasErrors = true;
    }
    if (!raw.surname || typeof raw.surname !== 'string' || raw.surname.trim() === '') {
      errors.push('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_SURNAME');
      hasErrors = true;
    }

    const type = raw.type as string;
    if (!type || (type !== 'adult' && type !== 'kid' && type !== 'other')) {
      errors.push('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_TYPE');
      hasErrors = true;
    }

    const gender = raw.gender as string;
    if (!gender || (gender !== 'male' && gender !== 'female' && gender !== 'other')) {
      errors.push('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_GENDER');
      hasErrors = true;
    }

    if (hasErrors) {
      return null;
    }

    return {
      id: raw.id && typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
      name: (raw.name as string).trim(),
      surname: (raw.surname as string).trim(),
      type: type as 'adult' | 'kid' | 'other',
      gender: gender as 'male' | 'female' | 'other',
      avatar: this.sanitizeAvatar(raw.avatar),
    };
  }

  private sanitizeAvatar(avatar: unknown): string {
    if (avatar && typeof avatar === 'string') {
      const isKnownAvatar = this.householdService.avatars.includes(avatar);
      const isDataUrl = avatar.startsWith('data:image/');
      if (isKnownAvatar || isDataUrl) {
        return avatar;
      }
    }
    const randomArray = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomArray);
    const randomIndex = randomArray[0] % this.householdService.avatars.length;
    return this.householdService.avatars[randomIndex];
  }

  /**
   * Export family members to a file.
   */
  async exportMembers(members: HouseholdMember[]): Promise<void> {
    // Ensure type and gender are always set (use 'other' as default for undefined)
    const exportMembers = members.map((m) => ({
      ...m,
      type: m.type || 'other',
      gender: m.gender || 'other',
    }));
    await this.fileStorage.exportData(exportMembers, 'family.json');
  }
}
