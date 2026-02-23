import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let mockLocalStorage: any;

  const mockPlatformId = 'browser';

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        { provide: PLATFORM_ID, useValue: mockPlatformId }
      ]
    });
    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('save', () => {
    it('should save data to localStorage with prefix', async () => {
      const key = 'testKey';
      const data = { value: 123 };
      await service.save(key, data);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hm_testKey', JSON.stringify(data));
    });

    it('should handle errors during save', async () => {
      const key = 'testKey';
      const data = { value: 123 };
      const error = new Error('Storage full');
      mockLocalStorage.setItem.mockImplementation(() => { throw error; });
      const consoleSpy = vi.spyOn(console, 'error');

      await service.save(key, data);

      expect(consoleSpy).toHaveBeenCalledWith(`Error saving to localStorage with key ${key}:`, error);
    });

    it('should not save if not browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LocalStorageService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      service = TestBed.inject(LocalStorageService);

      await service.save('key', 'value');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('load', () => {
    it('should load data from localStorage', async () => {
      const key = 'testKey';
      const data = { value: 123 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(data));

      const result = await service.load(key);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('hm_testKey');
      expect(result).toEqual(data);
    });

    it('should return null if item does not exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const result = await service.load('missing');
      expect(result).toBeNull();
    });

    it('should return raw string for non-JSON values', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const result = await service.load('key');
      expect(result).toBe('invalid-json');
    });

    it('should not load if not browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LocalStorageService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      service = TestBed.inject(LocalStorageService);
      const result = await service.load('key');
      expect(result).toBeNull();
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should remove item from localStorage', async () => {
      await service.delete('testKey');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('hm_testKey');
    });

    it('should handle errors during delete', async () => {
      const error = new Error('Delete failed');
      mockLocalStorage.removeItem.mockImplementation(() => { throw error; });
      const consoleSpy = vi.spyOn(console, 'error');

      await service.delete('testKey');
      expect(consoleSpy).toHaveBeenCalledWith(`Error deleting from localStorage with key testKey:`, error);
    });
  });

  describe('exists', () => {
    it('should return true if item exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('some value');
      expect(await service.exists('testKey')).toBe(true);
    });

    it('should return false if item does not exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(await service.exists('testKey')).toBe(false);
    });
  });

  describe('exportAll', () => {
    it('should export all items with hm_ prefix', async () => {
      mockLocalStorage.length = 2;
      mockLocalStorage.key.mockImplementation((i: number) => {
        return i === 0 ? 'hm_key1' : 'other_key';
      });
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'hm_key1') return JSON.stringify('value1');
        return null;
      });

      const result = await service.exportAll();
      expect(result).toEqual({ key1: 'value1' });
    });
  });

  describe('importAll', () => {
    it('should save all imported items', async () => {
      const data = { key1: 'value1', key2: 'value2' };
      await service.importAll(data);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hm_key1', JSON.stringify('value1'));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hm_key2', JSON.stringify('value2'));
    });
  });

  describe('exportRecords', () => {
    it('should export specific records', async () => {
      const records = [{ id: 1 }, { id: 2 }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(records));

      const result = await service.exportRecords('records');
      expect(result).toEqual(records);
    });

    it('should return empty array if no records found', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const result = await service.exportRecords('records');
      expect(result).toEqual([]);
    });
  });

  describe('Preferences (Sync)', () => {
    it('should get preference', () => {
      mockLocalStorage.getItem.mockReturnValue('value');
      expect(service.getPreference('pref')).toBe('value');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('hm_pref');
    });

    it('should set preference', () => {
      service.setPreference('pref', 'value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hm_pref', 'value');
    });

    it('should remove preference', () => {
      service.removePreference('pref');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('hm_pref');
    });
  });
});
