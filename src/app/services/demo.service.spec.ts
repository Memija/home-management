import { TestBed } from '@angular/core/testing';
import { DemoService } from './demo.service';
import { LocalStorageService } from './local-storage.service';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Typed mock interface for better type safety
interface MockLocalStorageService {
  exportAll: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  importAll: ReturnType<typeof vi.fn>;
  getPreference: ReturnType<typeof vi.fn>;
  setPreference: ReturnType<typeof vi.fn>;
  removePreference: ReturnType<typeof vi.fn>;
}

describe('DemoService', () => {
  let service: DemoService;
  let mockLocalStorageService: MockLocalStorageService;
  let originalFetch: typeof window.fetch;
  let originalLocation: any;
  let mockPlatformId: Object;

  beforeEach(() => {
    // Mock LocalStorageService
    mockLocalStorageService = {
      exportAll: vi.fn().mockResolvedValue({ 'key': 'value' }),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      importAll: vi.fn().mockResolvedValue(undefined),
      getPreference: vi.fn().mockReturnValue('true'),
      setPreference: vi.fn(),
      removePreference: vi.fn()
    };

    // Mock window.fetch
    originalFetch = window.fetch;
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    // Mock window.location.reload
    originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { reload: vi.fn() };

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem');
    vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'removeItem');

    mockPlatformId = 'browser';

    TestBed.configureTestingModule({
      providers: [
        DemoService,
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: PLATFORM_ID, useValue: mockPlatformId }
      ]
    });
    service = TestBed.inject(DemoService);

    // Ensure isDemoMode starts false to prevent test pollution
    (service.isDemoMode as any).set(false);
  });

  afterEach(() => {
    window.fetch = originalFetch;
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should check demo mode on initialization', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('true');

      // Re-create service to trigger constructor logic
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DemoService,
          { provide: LocalStorageService, useValue: mockLocalStorageService },
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });
      const newService = TestBed.inject(DemoService);

      expect(newService.isDemoMode()).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('hm_demo_mode_is_active');
    });

    it('should NOT check demo mode if not browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DemoService,
          { provide: LocalStorageService, useValue: mockLocalStorageService },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      const newService = TestBed.inject(DemoService);

      expect(newService.isDemoMode()).toBe(false);
      // Can't easily check if localStorage was NOT accessed because it's global,
      // but the code branch shouldn't run.
    });
  });

  describe('activateDemo', () => {
    it('should back up data, load demo data, and reload page', async () => {
      vi.mocked(window.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ data: 'test' }])
      } as any);

      await service.activateDemo();

      expect(mockLocalStorageService.exportAll).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalledWith('hm_user_backup', expect.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('hm_demo_mode_is_active', 'true');
      expect(mockLocalStorageService.save).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalled();
      expect(service.isDemoMode()).toBe(true);
    });

    it('should not activate if already in demo mode', async () => {
      (service.isDemoMode as any).set(true);

      await service.activateDemo();

      expect(mockLocalStorageService.exportAll).not.toHaveBeenCalled();
    });

    it('should handle errors and restore backup', async () => {
      mockLocalStorageService.exportAll.mockResolvedValue({ 'backup': true });
      vi.mocked(window.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(['data'])
      } as any);
      mockLocalStorageService.save.mockRejectedValue(new Error('Storage full'));

      await service.activateDemo();

      expect(mockLocalStorageService.exportAll).toHaveBeenCalled();
      expect(mockLocalStorageService.save).toHaveBeenCalled();
      expect(mockLocalStorageService.importAll).toHaveBeenCalledWith({ 'backup': true });
    });

    it('should set isLoading to true during activation and false after', async () => {
      let loadingDuringExecution = false;
      mockLocalStorageService.exportAll.mockImplementation(async () => {
        loadingDuringExecution = service.isLoading();
        return {};
      });

      await service.activateDemo();

      expect(loadingDuringExecution).toBe(true);
      expect(service.isLoading()).toBe(false);
    });

    it('should not activate if not in browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DemoService,
          { provide: LocalStorageService, useValue: mockLocalStorageService },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      const serverService = TestBed.inject(DemoService);

      await serverService.activateDemo();

      expect(mockLocalStorageService.exportAll).not.toHaveBeenCalled();
    });

    it('should handle fetch failure gracefully and still activate with empty data', async () => {
      mockLocalStorageService.exportAll.mockResolvedValue({ 'backup': true });
      // fetchJson catches errors and returns null, so activation still proceeds
      vi.mocked(window.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error('Not found'))
      } as any);

      await service.activateDemo();

      // Demo should still activate with empty/null data
      expect(service.isDemoMode()).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('hm_demo_mode_is_active', 'true');
      expect(service.isLoading()).toBe(false);
    });

    it('should load and save heating demo data correctly', async () => {
      const mockWaterRecords = [{ date: '2023-01-01', kitchenWarm: 10 }];
      const mockHeatingRecords = [{ date: '2023-01-01', rooms: { room_1: 100 } }];
      const mockHeatingSettings = [{ id: 'room_1', name: 'Living Room' }];
      const mockFamily = [{ id: '1', type: 'adult' }];
      const mockAddress = { city: 'Berlin', country: 'Germany' };
      const mockExcelSettings = { enabled: true };

      // Mock fetch to return different data based on URL
      vi.mocked(window.fetch).mockImplementation((url: any) => {
        if (url.includes('water-consumption.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockWaterRecords) } as any);
        } else if (url.includes('heating-consumption.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHeatingRecords) } as any);
        } else if (url.includes('heating-settings.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHeatingSettings) } as any);
        } else if (url.includes('family.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFamily) } as any);
        } else if (url.includes('address.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAddress) } as any);
        } else if (url.includes('excel-settings.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExcelSettings) } as any);
        }
        return Promise.resolve({ ok: false } as any);
      });

      await service.activateDemo();

      // Verify heating data was saved to correct storage keys
      expect(mockLocalStorageService.save).toHaveBeenCalledWith('water_records', mockWaterRecords);
      expect(mockLocalStorageService.save).toHaveBeenCalledWith('heating_consumption_records', mockHeatingRecords);
      expect(mockLocalStorageService.save).toHaveBeenCalledWith('heating_room_config', mockHeatingSettings);
      expect(mockLocalStorageService.save).toHaveBeenCalledWith('household_members', mockFamily);
      expect(mockLocalStorageService.save).toHaveBeenCalledWith('household_address', mockAddress);
      expect(mockLocalStorageService.save).toHaveBeenCalledWith('excel_settings', mockExcelSettings);
    });
  });

  describe('deactivateDemo', () => {
    beforeEach(() => {
      (service.isDemoMode as any).set(true);
    });

    it('should clear demo data, restore user data, and reload', async () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === 'hm_user_backup') return JSON.stringify({ storage: { k: 'v' }, preferences: { p: 'v' } });
        return null;
      });

      await service.deactivateDemo();

      expect(mockLocalStorageService.delete).toHaveBeenCalled();
      expect(mockLocalStorageService.removePreference).toHaveBeenCalled();
      expect(mockLocalStorageService.importAll).toHaveBeenCalledWith({ k: 'v' });
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith('p', 'v');
      expect(localStorage.removeItem).toHaveBeenCalledWith('hm_user_backup');
      expect(localStorage.removeItem).toHaveBeenCalledWith('hm_demo_mode_is_active');
      expect(window.location.reload).toHaveBeenCalled();
      expect(service.isDemoMode()).toBe(false);
    });

    it('should not deactivate if not in demo mode', async () => {
      (service.isDemoMode as any).set(false);
      await service.deactivateDemo();
      expect(mockLocalStorageService.delete).not.toHaveBeenCalled();
    });

    it('should set isLoading during deactivation and reset after', async () => {
      let loadingDuringExecution = false;
      mockLocalStorageService.delete.mockImplementation(async () => {
        loadingDuringExecution = service.isLoading();
      });
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      await service.deactivateDemo();

      expect(loadingDuringExecution).toBe(true);
      expect(service.isLoading()).toBe(false);
    });

    it('should not deactivate if not in browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DemoService,
          { provide: LocalStorageService, useValue: mockLocalStorageService },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      const serverService = TestBed.inject(DemoService);
      (serverService.isDemoMode as any).set(true);

      await serverService.deactivateDemo();

      expect(mockLocalStorageService.delete).not.toHaveBeenCalled();
    });

    it('should handle corrupted backup JSON gracefully', async () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === 'hm_user_backup') return 'invalid json{{{';
        return null;
      });

      await service.deactivateDemo();

      // Should not throw, should still cleanup
      expect(localStorage.removeItem).toHaveBeenCalledWith('hm_user_backup');
      expect(localStorage.removeItem).toHaveBeenCalledWith('hm_demo_mode_is_active');
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should work when backup has no preferences', async () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === 'hm_user_backup') return JSON.stringify({ storage: { k: 'v' } });
        return null;
      });

      await service.deactivateDemo();

      expect(mockLocalStorageService.importAll).toHaveBeenCalledWith({ k: 'v' });
      expect(mockLocalStorageService.setPreference).not.toHaveBeenCalled();
    });

    it('should delete all storage keys', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      await service.deactivateDemo();

      expect(mockLocalStorageService.delete).toHaveBeenCalledWith('water_records');
      expect(mockLocalStorageService.delete).toHaveBeenCalledWith('heating_consumption_records');
      expect(mockLocalStorageService.delete).toHaveBeenCalledWith('heating_room_config');
      expect(mockLocalStorageService.delete).toHaveBeenCalledWith('household_members');
      expect(mockLocalStorageService.delete).toHaveBeenCalledWith('household_address');
      expect(mockLocalStorageService.delete).toHaveBeenCalledWith('excel_settings');
    });

    it('should remove all preference keys', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      await service.deactivateDemo();

      expect(mockLocalStorageService.removePreference).toHaveBeenCalledWith('water_confirmed_meter_changes');
      expect(mockLocalStorageService.removePreference).toHaveBeenCalledWith('water_dismissed_meter_changes');
    });
  });
});
