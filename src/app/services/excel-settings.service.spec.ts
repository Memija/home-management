import { TestBed } from '@angular/core/testing';
import { ExcelSettingsService } from './excel-settings.service';
import { STORAGE_SERVICE } from './storage.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ExcelSettingsService', () => {
  let service: ExcelSettingsService;
  let mockStorageService: any;
  let mockLanguageService: any;

  beforeEach(() => {
    mockStorageService = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };

    mockLanguageService = {
      translate: vi.fn((key: string) => key),
    };

    TestBed.configureTestingModule({
      providers: [
        ExcelSettingsService,
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    });

    service = TestBed.inject(ExcelSettingsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created and load defaults', async () => {
    expect(service).toBeTruthy();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(service.isEnabled()).toBe(false);
    expect(service.getWaterMapping().date).toBe('EXCEL.DEFAULT_DATE');
  });

  it('should load settings from storage', async () => {
      // Mock storage response
      mockStorageService.load.mockResolvedValue({
          enabled: true,
          waterMapping: { date: 'Custom Date' }
      });

      // Re-create service to trigger load
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
          providers: [
            ExcelSettingsService,
            { provide: STORAGE_SERVICE, useValue: mockStorageService },
            { provide: LanguageService, useValue: mockLanguageService },
          ],
      });
      service = TestBed.inject(ExcelSettingsService);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(service.isEnabled()).toBe(true);
      expect(service.getWaterMapping().date).toBe('Custom Date');
      // Should merge with defaults for missing keys
      expect(service.getWaterMapping().kitchenWarm).toBe('EXCEL.DEFAULT_KITCHEN_WARM');
  });

  it('should update settings and save', async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // wait for load and initialization

      // Create a NEW object reference to ensure signal updates
      const newSettings = { ...service.settings(), enabled: true };
      service.updateSettings(newSettings);

      await new Promise(resolve => setTimeout(resolve, 50)); // wait for effect

      expect(service.isEnabled()).toBe(true);
      expect(mockStorageService.save).toHaveBeenCalledWith('excel_settings', newSettings);
  });

  it('should reset to defaults', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      service.updateSettings({ ...service.settings(), enabled: true });
      expect(service.isEnabled()).toBe(true);

      service.resetToDefaults();
      expect(service.isEnabled()).toBe(false);
      expect(service.getWaterMapping().date).toBe('EXCEL.DEFAULT_DATE');
  });

  it('should not save on initial load', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockStorageService.save).not.toHaveBeenCalled();

      // Now let's try with data in storage
      mockStorageService.load.mockResolvedValue({ enabled: true });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
          providers: [
            ExcelSettingsService,
            { provide: STORAGE_SERVICE, useValue: mockStorageService },
            { provide: LanguageService, useValue: mockLanguageService },
          ],
      });
      service = TestBed.inject(ExcelSettingsService);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockStorageService.save).not.toHaveBeenCalled();
  });

  it('should not save on initial load (with data)', async () => {
       mockStorageService.load.mockResolvedValue({ enabled: true });

       TestBed.resetTestingModule();
       TestBed.configureTestingModule({
           providers: [
             ExcelSettingsService,
             { provide: STORAGE_SERVICE, useValue: mockStorageService },
             { provide: LanguageService, useValue: mockLanguageService },
           ],
       });
       service = TestBed.inject(ExcelSettingsService);

       await new Promise(resolve => setTimeout(resolve, 50));

       expect(mockStorageService.save).not.toHaveBeenCalled();
  });
});
