import { TestBed } from '@angular/core/testing';
import { DemoService } from './demo.service';
import { LocalStorageService } from './local-storage.service';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('DemoService', () => {
  let service: DemoService;
  let mockLocalStorageService: any;
  let originalFetch: any;
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
        // Set demo mode true
        (service.isDemoMode as any).set(true);

        await service.activateDemo();

        expect(mockLocalStorageService.exportAll).not.toHaveBeenCalled();
    });

    it('should handle errors and restore backup', async () => {
        // Ensure not in demo mode
        (service.isDemoMode as any).set(false);

        // Ensure exportAll returns data
        mockLocalStorageService.exportAll.mockResolvedValue({ 'backup': true });

        // Ensure fetch works
        vi.mocked(window.fetch).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(['data'])
        } as any);

        // Make storage.save fail
        mockLocalStorageService.save.mockRejectedValue(new Error('Storage full'));

        await service.activateDemo();

        expect(mockLocalStorageService.exportAll).toHaveBeenCalled();
        expect(mockLocalStorageService.save).toHaveBeenCalled();
        expect(mockLocalStorageService.importAll).toHaveBeenCalledWith({ 'backup': true });
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
  });
});
