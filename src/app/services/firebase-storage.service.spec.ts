import { TestBed } from '@angular/core/testing';
import { FirebaseStorageService } from './firebase-storage.service';
import { Firestore } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PLATFORM_ID } from '@angular/core';

// Mock Firestore functions
const mockDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockCollection = vi.fn();
const mockGetDocs = vi.fn();
const mockDeleteField = vi.fn();

vi.mock('@angular/fire/firestore', () => ({
  Firestore: class { },
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  deleteField: () => mockDeleteField()
}));

describe('FirebaseStorageService', () => {
  let service: FirebaseStorageService;
  let authServiceMock: any;
  let firestoreMock: any;

  beforeEach(() => {
    authServiceMock = {
      getCurrentUid: vi.fn().mockReturnValue('test-uid')
    };

    firestoreMock = {};

    TestBed.configureTestingModule({
      providers: [
        FirebaseStorageService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(FirebaseStorageService);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('save', () => {
    it('should save data to firestore', async () => {
      const key = 'test-key';
      const data = { foo: 'bar' };

      mockDoc.mockReturnValue('doc-ref');

      await service.save(key, data);

      expect(mockDoc).toHaveBeenCalledWith(firestoreMock, 'users/test-uid/data/test-key');
      expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', expect.objectContaining({
        value: data,
        updatedAt: expect.any(String)
      }));
    });

    it('should not save if not browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          FirebaseStorageService,
          { provide: Firestore, useValue: firestoreMock },
          { provide: AuthService, useValue: authServiceMock },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      const serverService = TestBed.inject(FirebaseStorageService);

      await serverService.save('key', {});
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('should not save if no uid', async () => {
      authServiceMock.getCurrentUid.mockReturnValue(null);
      await service.save('key', {});
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe('load', () => {
    it('should load data from firestore', async () => {
      const key = 'test-key';
      const data = { foo: 'bar' };

      mockDoc.mockReturnValue('doc-ref');
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ value: data })
      });

      const result = await service.load(key);

      expect(mockDoc).toHaveBeenCalledWith(firestoreMock, 'users/test-uid/data/test-key');
      expect(mockGetDoc).toHaveBeenCalledWith('doc-ref');
      expect(result).toEqual(data);
    });

    it('should return null if doc does not exist', async () => {
      mockDoc.mockReturnValue('doc-ref');
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await service.load('key');
      expect(result).toBeNull();
    });

    it('should return null if error', async () => {
      mockDoc.mockReturnValue('doc-ref');
      mockGetDoc.mockRejectedValue(new Error('fail'));

      const result = await service.load('key');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete doc from firestore', async () => {
      const key = 'test-key';
      mockDoc.mockReturnValue('doc-ref');

      await service.delete(key);

      expect(mockDeleteDoc).toHaveBeenCalledWith('doc-ref');
    });
  });

  describe('exists', () => {
    it('should return true if doc exists', async () => {
      mockDoc.mockReturnValue('doc-ref');
      mockGetDoc.mockResolvedValue({ exists: () => true });

      const result = await service.exists('key');
      expect(result).toBe(true);
    });

    it('should return false if doc does not exist', async () => {
      mockDoc.mockReturnValue('doc-ref');
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await service.exists('key');
      expect(result).toBe(false);
    });
  });

  describe('exportAll', () => {
    it('should export all data', async () => {
      mockCollection.mockReturnValue('col-ref');
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => {
          callback({ id: 'key1', data: () => ({ value: 'val1' }) });
          callback({ id: 'user_settings', data: () => ({ theme: 'dark' }) });
        }
      });

      const result = await service.exportAll();

      expect(mockCollection).toHaveBeenCalledWith(firestoreMock, 'users/test-uid/data');
      expect(result).toEqual({
        key1: 'val1',
        user_settings: { theme: 'dark' }
      });
    });
  });

  describe('importAll', () => {
    it('should save each item', async () => {
      const data = { key1: 'val1', key2: 'val2' };
      const saveSpy = vi.spyOn(service, 'save').mockResolvedValue();

      await service.importAll(data);

      expect(saveSpy).toHaveBeenCalledWith('key1', 'val1');
      expect(saveSpy).toHaveBeenCalledWith('key2', 'val2');
    });
  });

  describe('settings', () => {
    it('should update settings', async () => {
      mockDoc.mockReturnValue('doc-ref');
      const settings = { theme: 'dark' };

      await service.updateSettings(settings);

      expect(mockDoc).toHaveBeenCalledWith(firestoreMock, 'users/test-uid/data/user_settings');
      expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', settings, { merge: true });
    });

    it('should get settings', async () => {
      mockDoc.mockReturnValue('doc-ref');
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ theme: 'dark' })
      });

      const result = await service.getSettings();
      expect(result).toEqual({ theme: 'dark' });
    });

    it('should delete setting', async () => {
      mockDoc.mockReturnValue('doc-ref');
      mockDeleteField.mockReturnValue('delete-field-marker');

      await service.deleteSetting('theme');

      expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', { theme: 'delete-field-marker' }, { merge: true });
    });
  });

  describe('deleteAllUserData', () => {
    it('should delete all docs in collection', async () => {
      mockCollection.mockReturnValue('col-ref');
      const doc1 = { ref: 'ref1' };
      const doc2 = { ref: 'ref2' };

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => {
          callback(doc1);
          callback(doc2);
        }
      });

      await service.deleteAllUserData();

      expect(mockDeleteDoc).toHaveBeenCalledWith('ref1');
      expect(mockDeleteDoc).toHaveBeenCalledWith('ref2');
    });
  });
});
