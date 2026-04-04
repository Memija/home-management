import { TestBed } from '@angular/core/testing';
import { HybridStorageService } from './hybrid-storage.service';
import { LocalStorageService } from './local-storage.service';
import { FirebaseStorageService } from './firebase-storage.service';
import { AuthService } from './auth.service';
import { DemoService } from './demo.service';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';

describe('HybridStorageService', () => {
  let service: HybridStorageService;
  let localStorageSpy: {
    getPreference: Mock;
    setPreference: Mock;
    removePreference: Mock;
    save: Mock;
    load: Mock;
    delete: Mock;
    exists: Mock;
    exportAll: Mock;
    importAll: Mock;
    exportRecords: Mock;
    importRecords: Mock;
  };
  let firebaseStorageSpy: {
    updateSettings: Mock;
    save: Mock;
    delete: Mock;
    deleteSetting: Mock;
    deleteAllUserData: Mock;
    exportAll: Mock;
    importAll: Mock;
    importRecords: Mock;
  };
  let authServiceSpy: { isAuthenticated: Mock };
  let demoServiceSpy: { isDemoMode: Mock };

  beforeEach(() => {
    TestBed.resetTestingModule();

    // Ensure localStorage has the required methods for tests
    if (typeof localStorage === 'undefined' || !localStorage.clear) {
      const mockStorage: any = {
        store: {} as Record<string, string>,
        getItem: (key: string) => mockStorage.store[key] || null,
        setItem: (key: string, value: string) => mockStorage.store[key] = value,
        removeItem: (key: string) => delete mockStorage.store[key],
        clear: () => mockStorage.store = {},
        key: (index: number) => Object.keys(mockStorage.store)[index] || null,
        get length() { return Object.keys(mockStorage.store).length; }
      };
      vi.stubGlobal('localStorage', mockStorage);
    }

    localStorageSpy = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      removePreference: vi.fn(),
      save: vi.fn(),
      load: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      exportAll: vi.fn(),
      importAll: vi.fn(),
      exportRecords: vi.fn(),
      importRecords: vi.fn(),
    };
    firebaseStorageSpy = {
      updateSettings: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      deleteSetting: vi.fn(),
      deleteAllUserData: vi.fn(),
      exportAll: vi.fn(),
      importAll: vi.fn(),
      importRecords: vi.fn(),
    };
    authServiceSpy = { isAuthenticated: vi.fn() };
    demoServiceSpy = { isDemoMode: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        HybridStorageService,
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: FirebaseStorageService, useValue: firebaseStorageSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: DemoService, useValue: demoServiceSpy },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(HybridStorageService);
    // Spies are already assigned above, no need to re-inject and cast unless testing provider logic explicitly
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with default "local" mode if no storage found', () => {
      localStorageSpy.getPreference.mockReturnValue(null);

      // Re-inject to trigger constructor logic
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          HybridStorageService,
          { provide: LocalStorageService, useValue: localStorageSpy },
          { provide: FirebaseStorageService, useValue: firebaseStorageSpy },
          { provide: AuthService, useValue: authServiceSpy },
          { provide: DemoService, useValue: demoServiceSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(HybridStorageService);

      expect(service.mode()).toBe('local');
    });

    it('should load stored mode from local storage', () => {
      localStorageSpy.getPreference.mockImplementation((key: string) => {
        if (key === 'storage_mode') return 'cloud';
        return null;
      });

      // Re-initialize to trigger constructor logic with mocked return value
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          HybridStorageService,
          { provide: LocalStorageService, useValue: localStorageSpy },
          { provide: FirebaseStorageService, useValue: firebaseStorageSpy },
          { provide: AuthService, useValue: authServiceSpy },
          { provide: DemoService, useValue: demoServiceSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(HybridStorageService);

      expect(service.mode()).toBe('cloud');
    });
  });

  describe('Mode Management', () => {
    it('should set mode and save to local storage', () => {
      service.setMode('cloud');
      expect(service.mode()).toBe('cloud');
      expect(localStorageSpy.setPreference).toHaveBeenCalledWith('storage_mode', 'cloud');
    });

    it('should toggle mode between local and cloud', () => {
      service.mode.set('local');
      service.toggleMode();
      expect(service.mode()).toBe('cloud');

      service.toggleMode();
      expect(service.mode()).toBe('local');
    });

    it('should determine isCloudMode as true when authenticated and in cloud mode', () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      expect(service.isCloudMode()).toBe(true);
    });

    it('should determine isCloudMode as false when NOT authenticated', () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(false);
      expect(service.isCloudMode()).toBe(false);
    });

    it('should force isCloudMode to false if in demo mode', () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      demoServiceSpy.isDemoMode.mockReturnValue(true);

      expect(service.isCloudMode()).toBe(false);
    });
  });

  describe('CRUD Operations', () => {
    it('save() should replace local storage and trigger background sync if cloud mode is active', async () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      demoServiceSpy.isDemoMode.mockReturnValue(false);

      const key = 'test_key';
      const data = { foo: 'bar' };

      // Setup promises
      localStorageSpy.save.mockResolvedValue(undefined);
      firebaseStorageSpy.save.mockResolvedValue(undefined);

      await service.save(key, data);

      expect(localStorageSpy.save).toHaveBeenCalledWith(key, data);
      expect(firebaseStorageSpy.save).toHaveBeenCalledWith(key, data);
    });

    it('save() should trigger refreshLocalContentStatus', async () => {
      const spy = vi.spyOn(service, 'refreshLocalContentStatus');
      await service.save('test_key', { foo: 'bar' });
      expect(spy).toHaveBeenCalled();
    });

    it('save() should NOT sync to cloud if isCloudMode is false', async () => {
      service.mode.set('local');

      const key = 'test_key';
      const data = { foo: 'bar' };

      localStorageSpy.save.mockResolvedValue(undefined);

      await service.save(key, data);

      expect(localStorageSpy.save).toHaveBeenCalledWith(key, data);
      expect(firebaseStorageSpy.save).not.toHaveBeenCalled();
    });

    it('load() should always read from local storage', async () => {
      const key = 'test_key';
      const expectedData = { foo: 'bar' };
      localStorageSpy.load.mockResolvedValue(expectedData);

      const result = await service.load(key);

      expect(localStorageSpy.load).toHaveBeenCalledWith(key);
      expect(result).toEqual(expectedData);
    });

    it('delete() should remove from local and cloud if active', async () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      demoServiceSpy.isDemoMode.mockReturnValue(false);

      const key = 'test_key';
      localStorageSpy.delete.mockResolvedValue(undefined);
      firebaseStorageSpy.delete.mockResolvedValue(undefined);

      await service.delete(key);

      expect(localStorageSpy.delete).toHaveBeenCalledWith(key);
      expect(firebaseStorageSpy.delete).toHaveBeenCalledWith(key);
    });

    it('delete() should trigger refreshLocalContentStatus', async () => {
      const spy = vi.spyOn(service, 'refreshLocalContentStatus');
      await service.delete('test_key');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Sync Operations', () => {
    it('migrateLocalToCloud() should export local data and save to firebase', async () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      const mockData = {
        water_consumption_records: [1, 2, 3],
        theme: 'dark',
        unknown_key: 'ignored',
      };
      localStorageSpy.exportAll.mockResolvedValue(mockData);
      firebaseStorageSpy.save.mockResolvedValue(undefined);
      firebaseStorageSpy.updateSettings.mockResolvedValue(undefined);

      await service.migrateLocalToCloud();

      expect(localStorageSpy.exportAll).toHaveBeenCalled();
      expect(firebaseStorageSpy.save).toHaveBeenCalledWith(
        'water_consumption_records',
        mockData['water_consumption_records'],
      );
      expect(firebaseStorageSpy.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'dark' }),
      );

      expect(firebaseStorageSpy.save).not.toHaveBeenCalledWith('unknown_key', expect.any(Object));
    });

    it('pullFromCloud() should export from firebase and import to local', async () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      const cloudData: any = {
        user_settings: { theme: 'dark', water_chart_view: 'weekly' },
        water_consumption_records: [1, 2, 3],
        storage_mode: 'cloud',
      };

      firebaseStorageSpy.exportAll.mockResolvedValue(cloudData);
      localStorageSpy.importAll.mockResolvedValue(undefined);

      await service.pullFromCloud();

      expect(firebaseStorageSpy.exportAll).toHaveBeenCalled();

      expect(localStorageSpy.importAll).toHaveBeenCalled();
      // The argument passed to importAll has had keys removed
      const importedData = localStorageSpy.importAll.mock.calls[0][0] as any;

      // 'water_consumption_records' should be in importedData
      expect(importedData['water_consumption_records']).toEqual([1, 2, 3]);

      // 'user_settings' should be unpacked.
      // 'water_chart_view' is a setting, should be in importedData
      expect(importedData['water_chart_view']).toBe('weekly');

      // 'theme' is a preference, so it should be REMOVED from importedData and set via setPreference
      expect(importedData['theme']).toBeUndefined();
      expect(localStorageSpy.setPreference).toHaveBeenCalledWith('theme', 'dark');

      // 'storage_mode' is a preference, should be removed and set via setPreference
      expect(importedData['storage_mode']).toBeUndefined();
      expect(localStorageSpy.setPreference).toHaveBeenCalledWith('storage_mode', 'cloud');
    });

    it('clearCloudData() should delete all user data from firebase', async () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      firebaseStorageSpy.deleteAllUserData.mockResolvedValue(undefined);

      await service.clearCloudData();

      expect(firebaseStorageSpy.deleteAllUserData).toHaveBeenCalled();
      expect(service.lastSyncTime()).toBe(null);
      expect(localStorageSpy.removePreference).toHaveBeenCalledWith('last_sync_timestamp');
    });

    it('importAll() should trigger refreshLocalContentStatus', async () => {
      const spy = vi.spyOn(service, 'refreshLocalContentStatus');
      await service.importAll({ some: 'data' });
      expect(spy).toHaveBeenCalled();
    });

    it('importRecords() should trigger refreshLocalContentStatus', async () => {
      const spy = vi.spyOn(service, 'refreshLocalContentStatus');
      await service.importRecords('key', []);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('initialization should handle invalid last sync timestamp', () => {
      localStorageSpy.getPreference.mockImplementation((key: string) => {
        if (key === 'storage_mode') return 'local';
        if (key === 'last_sync_timestamp') return 'invalid-date';
        return null;
      });

      // Re-init
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          HybridStorageService,
          { provide: LocalStorageService, useValue: localStorageSpy },
          { provide: FirebaseStorageService, useValue: firebaseStorageSpy },
          { provide: AuthService, useValue: authServiceSpy },
          { provide: DemoService, useValue: demoServiceSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(HybridStorageService);

      expect(service.lastSyncTime()).toBe(null);
      expect(localStorageSpy.removePreference).toHaveBeenCalledWith('last_sync_timestamp');
    });

    it('should NOT sync to cloud if in Demo Mode, even if authenticated and mode is cloud', async () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      demoServiceSpy.isDemoMode.mockReturnValue(true); // Demo mode ON

      const key = 'test_key';
      const data = { foo: 'bar' };
      localStorageSpy.save.mockResolvedValue(undefined);

      await service.save(key, data);

      expect(localStorageSpy.save).toHaveBeenCalled();
      expect(firebaseStorageSpy.save).not.toHaveBeenCalled();
      expect(firebaseStorageSpy.updateSettings).not.toHaveBeenCalled();
    });

    it('background sync failure should NOT fail the main save promise', async () => {
      service.mode.set('cloud');
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      demoServiceSpy.isDemoMode.mockReturnValue(false);

      const key = 'test_key';
      localStorageSpy.save.mockResolvedValue(undefined);
      firebaseStorageSpy.save.mockRejectedValue('Network Error'); // Background failure

      // The promise returned by save should resolve successfully because background sync is validly background
      let error: any;
      await service.save(key, { foo: 'bar' }).catch((e) => (error = e));

      expect(error).toBeUndefined();
      expect(localStorageSpy.save).toHaveBeenCalled();
      expect(firebaseStorageSpy.save).toHaveBeenCalled();
    });
  });

  describe('refreshLocalContentStatus()', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should set hasUserContent to false if only system keys are present', () => {
      localStorage.setItem('hm_season_sync', 'true');
      localStorage.setItem('hm_excel_preview_is_collapsed', 'true');
      localStorage.setItem('hm_storage_mode', 'local');
      localStorage.setItem('hm_theme', 'dark');
      localStorage.setItem('hm_preferred_language', 'en');

      service.refreshLocalContentStatus();
      expect(service.hasUserContent()).toBe(false);
    });

    it('should set hasUserContent to true if any non-system hm_ keys are present', () => {
      localStorage.setItem('hm_season_sync', 'true');
      localStorage.setItem('hm_household_address', '{"street":"1"}');

      service.refreshLocalContentStatus();
      expect(service.hasUserContent()).toBe(true);
    });

    it('should set hasUserContent to false if NO hm_ keys are present', () => {
      localStorage.setItem('other_app_key', 'val');

      service.refreshLocalContentStatus();
      expect(service.hasUserContent()).toBe(false);
    });

    it('should set hasUserContent to true if consumption records are present', () => {
      localStorage.setItem('hm_water_consumption_records', '[]');

      service.refreshLocalContentStatus();
      expect(service.hasUserContent()).toBe(true);
    });

    it('should set hasUserContent to true if household members are present', () => {
      localStorage.setItem('hm_household_members', '[{"id":"1"}]');

      service.refreshLocalContentStatus();
      expect(service.hasUserContent()).toBe(true);
    });

    it('should handle empty localStorage', () => {
      service.refreshLocalContentStatus();
      expect(service.hasUserContent()).toBe(false);
    });
  });
});
