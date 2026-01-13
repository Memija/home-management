import { TestBed } from '@angular/core/testing';
import { FamilyImportService } from './family-import.service';
import { HouseholdService } from './household.service';
import { LanguageService } from './language.service';
import { FileStorageService } from './file-storage.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FamilyImportService', () => {
  let service: FamilyImportService;
  let mockHouseholdService: any;
  let mockLanguageService: any;
  let mockFileStorageService: any;

  beforeEach(() => {
    mockHouseholdService = {
      avatars: ['avatar1.png', 'avatar2.png']
    };

    mockLanguageService = {
      translate: vi.fn().mockImplementation((key) => key)
    };

    mockFileStorageService = {
      importData: vi.fn(),
      exportData: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        FamilyImportService,
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: FileStorageService, useValue: mockFileStorageService }
      ]
    });
    service = TestBed.inject(FamilyImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('importFromFile', () => {
    it('should return success: false if user cancelled', async () => {
      mockFileStorageService.importData.mockResolvedValue(null);
      const result = await service.importFromFile();
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should handle invalid file type error', async () => {
      mockFileStorageService.importData.mockResolvedValue({ error: 'invalid_file_type' });
      const result = await service.importFromFile();
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE');
    });

    it('should handle invalid JSON format error', async () => {
      mockFileStorageService.importData.mockResolvedValue({ error: 'invalid_json' });
      const result = await service.importFromFile();
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('HOME.IMPORT_INVALID_FORMAT');
    });

    it('should handle non-array data', async () => {
      mockFileStorageService.importData.mockResolvedValue({ data: {} });
      const result = await service.importFromFile();
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('SETTINGS.IMPORT_FAMILY_INVALID_FORMAT');
    });

    it('should handle validation errors in data', async () => {
      mockFileStorageService.importData.mockResolvedValue({
        data: [{ name: 'Test' }] // Missing surname etc
      });
      const result = await service.importFromFile();
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('SETTINGS.IMPORT_FAMILY_INVALID_DATA');
      expect(result.errorInstructions?.length).toBeGreaterThan(0);
    });

    it('should import valid members', async () => {
      const validData = [
        { name: 'John', surname: 'Doe', type: 'adult', gender: 'male', avatar: 'avatar1.png' }
      ];
      mockFileStorageService.importData.mockResolvedValue({ data: validData });

      const result = await service.importFromFile();

      expect(result.success).toBe(true);
      expect(result.members?.length).toBe(1);
      expect(result.members?.[0].name).toBe('John');
      expect(result.members?.[0].id).toBeDefined();
    });
  });

  describe('validateImportedMembers', () => {
    it('should validate required fields', () => {
      const data = [{}];
      const result = service.validateImportedMembers(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_NAME');
      expect(result.errors).toContain('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_SURNAME');
      expect(result.errors).toContain('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_TYPE');
      expect(result.errors).toContain('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_GENDER');
    });

    it('should validate type values', () => {
      const data = [{ name: 'A', surname: 'B', type: 'alien', gender: 'male' }];
      const result = service.validateImportedMembers(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_TYPE');
    });

    it('should validate gender values', () => {
      const data = [{ name: 'A', surname: 'B', type: 'adult', gender: 'alien' }];
      const result = service.validateImportedMembers(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_GENDER');
    });

    it('should use random avatar if invalid or missing', () => {
      // Mock Math.random to return 0 (first avatar)
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const data = [{ name: 'A', surname: 'B', type: 'adult', gender: 'male' }];
      const result = service.validateImportedMembers(data);

      expect(result.valid).toBe(true);
      expect(result.members?.[0].avatar).toBe('avatar1.png');
    });

    it('should accept data URL avatars', () => {
      const dataUrl = 'data:image/png;base64,...';
      const data = [{ name: 'A', surname: 'B', type: 'adult', gender: 'male', avatar: dataUrl }];
      const result = service.validateImportedMembers(data);

      expect(result.valid).toBe(true);
      expect(result.members?.[0].avatar).toBe(dataUrl);
    });

    it('should fail if all records invalid', () => {
        const data = [{ name: '' }]; // invalid
        const result = service.validateImportedMembers(data);
        expect(result.valid).toBe(false);
    });

    it('should fail if no valid members found even if input array not empty', () => {
        // e.g. empty object
        const data = [{}];
        const result = service.validateImportedMembers(data);
        expect(result.valid).toBe(false);
    });
  });

  describe('exportMembers', () => {
      it('should export members', async () => {
          const members = [
              { id: '1', name: 'John', surname: 'Doe', type: 'adult', gender: 'male', avatar: 'a.png' }
          ] as any[];

          await service.exportMembers(members);

          expect(mockFileStorageService.exportData).toHaveBeenCalledWith(
              expect.arrayContaining([expect.objectContaining({ name: 'John' })]),
              'family.json'
          );
      });
  });
});
