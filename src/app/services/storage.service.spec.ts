import { TestBed } from '@angular/core/testing';
import { InjectionToken } from '@angular/core';
import { StorageService, STORAGE_SERVICE } from './storage.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('StorageService', () => {
  // Concrete implementation for testing the abstract class
  class MockStorageService extends StorageService {
    private storage: Map<string, any> = new Map();

    async save<T>(key: string, data: T): Promise<void> {
      this.storage.set(key, data);
    }

    async load<T>(key: string): Promise<T | null> {
      return this.storage.has(key) ? this.storage.get(key) : null;
    }

    async delete(key: string): Promise<void> {
      this.storage.delete(key);
    }

    async exists(key: string): Promise<boolean> {
      return this.storage.has(key);
    }

    async exportAll(): Promise<Record<string, unknown>> {
      return Object.fromEntries(this.storage);
    }

    async importAll(data: Record<string, unknown>): Promise<void> {
      for (const [key, value] of Object.entries(data)) {
        this.storage.set(key, value);
      }
    }

    async exportRecords(recordKey: string): Promise<unknown[]> {
      const data = this.storage.get(recordKey);
      return Array.isArray(data) ? data : [];
    }

    async importRecords(recordKey: string, records: unknown[]): Promise<void> {
      this.storage.set(recordKey, records);
    }
  }

  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_SERVICE, useClass: MockStorageService }
      ]
    });
    service = TestBed.inject(STORAGE_SERVICE);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have a valid injection token', () => {
    expect(STORAGE_SERVICE).toBeInstanceOf(InjectionToken);
    expect(STORAGE_SERVICE.toString()).toContain('StorageService');
  });

  it('should be able to resolve concrete implementation via injection token', () => {
    expect(service).toBeInstanceOf(MockStorageService);
  });

  // Verify the contract works as expected with the mock implementation
  describe('Contract verification', () => {
    it('should save and load data', async () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };

      await service.save(key, data);
      const loaded = await service.load(key);

      expect(loaded).toEqual(data);
    });

    it('should return null for non-existent keys', async () => {
      const loaded = await service.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should check existence', async () => {
      await service.save('exists', true);
      expect(await service.exists('exists')).toBe(true);
      expect(await service.exists('missing')).toBe(false);
    });

    it('should delete data', async () => {
      await service.save('delete-me', 'value');
      await service.delete('delete-me');
      expect(await service.exists('delete-me')).toBe(false);
    });

    it('should export all data', async () => {
      await service.save('k1', 'v1');
      await service.save('k2', 'v2');
      const all = await service.exportAll();
      expect(all).toEqual({ k1: 'v1', k2: 'v2' });
    });

    it('should import all data', async () => {
      await service.importAll({ k3: 'v3', k4: 'v4' });
      expect(await service.load('k3')).toBe('v3');
      expect(await service.load('k4')).toBe('v4');
    });
  });
});
