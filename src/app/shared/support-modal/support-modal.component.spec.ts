import { TestBed } from '@angular/core/testing';
import { SupportModalComponent } from './support-modal.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { X, Heart } from 'lucide-angular';

/**
 * Unit tests for SupportModalComponent.
 *
 * Uses TestBed.runInInjectionContext to create the component class directly,
 * avoiding the templateUrl/styleUrl resolution issue in Vitest while still
 * satisfying Angular's injection context requirement for output().
 */
describe('SupportModalComponent', () => {
  let component: SupportModalComponent;
  let mockSanitizer: DomSanitizer;
  const EXPECTED_KOFI_URL = 'https://ko-fi.com/memija/?hidefeed=true&widget=true&embed=true&preview=true';
  const MOCK_SAFE_URL = { toString: () => EXPECTED_KOFI_URL } as SafeResourceUrl;

  beforeEach(() => {
    mockSanitizer = {
      bypassSecurityTrustResourceUrl: vi.fn().mockReturnValue(MOCK_SAFE_URL),
      bypassSecurityTrustHtml: vi.fn(),
      bypassSecurityTrustStyle: vi.fn(),
      bypassSecurityTrustScript: vi.fn(),
      bypassSecurityTrustUrl: vi.fn(),
      sanitize: vi.fn(),
    } as unknown as DomSanitizer;

    TestBed.configureTestingModule({});

    component = TestBed.runInInjectionContext(() => {
      return new SupportModalComponent(mockSanitizer);
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Icon Initialization', () => {
    it('should have XIcon set to lucide X icon', () => {
      expect(component.XIcon).toBe(X);
    });

    it('should have HeartIcon set to lucide Heart icon', () => {
      expect(component.HeartIcon).toBe(Heart);
    });

    it('should have XIcon as readonly (same reference across accesses)', () => {
      const first = component.XIcon;
      const second = component.XIcon;
      expect(first).toBe(second);
    });

    it('should have HeartIcon as readonly (same reference across accesses)', () => {
      const first = component.HeartIcon;
      const second = component.HeartIcon;
      expect(first).toBe(second);
    });
  });

  describe('Ko-fi URL Sanitization', () => {
    it('should call bypassSecurityTrustResourceUrl with the correct Ko-fi URL', () => {
      expect(mockSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(EXPECTED_KOFI_URL);
    });

    it('should call bypassSecurityTrustResourceUrl exactly once', () => {
      expect(mockSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledTimes(1);
    });

    it('should store the sanitized URL in kofiUrl', () => {
      expect(component.kofiUrl).toBe(MOCK_SAFE_URL);
    });

    it('should not use bypassSecurityTrustUrl (must use ResourceUrl for iframes)', () => {
      expect(mockSanitizer.bypassSecurityTrustUrl).not.toHaveBeenCalled();
    });

    it('should not use bypassSecurityTrustHtml', () => {
      expect(mockSanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
    });

    it('should include hidefeed=true in the URL', () => {
      const calledUrl = (mockSanitizer.bypassSecurityTrustResourceUrl as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledUrl).toContain('hidefeed=true');
    });

    it('should include widget=true in the URL', () => {
      const calledUrl = (mockSanitizer.bypassSecurityTrustResourceUrl as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledUrl).toContain('widget=true');
    });

    it('should include embed=true in the URL', () => {
      const calledUrl = (mockSanitizer.bypassSecurityTrustResourceUrl as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledUrl).toContain('embed=true');
    });

    it('should include preview=true in the URL', () => {
      const calledUrl = (mockSanitizer.bypassSecurityTrustResourceUrl as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledUrl).toContain('preview=true');
    });

    it('should point to the correct Ko-fi user (memija)', () => {
      const calledUrl = (mockSanitizer.bypassSecurityTrustResourceUrl as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledUrl).toContain('ko-fi.com/memija');
    });
  });

  describe('Close Output Emission', () => {
    it('should emit close when onClose() is called', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.onClose();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit void (undefined) on close', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.onClose();

      // Angular output<void>().emit() passes undefined as the value
      expect(closeSpy).toHaveBeenCalledWith(undefined);
    });

    it('should emit close multiple times for repeated calls', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.onClose();
      component.onClose();
      component.onClose();

      expect(closeSpy).toHaveBeenCalledTimes(3);
    });

    it('should not throw when onClose() is called without subscribers', () => {
      expect(() => component.onClose()).not.toThrow();
    });

    it('should emit to multiple subscribers independently', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      component.close.subscribe(spy1);
      component.close.subscribe(spy2);

      component.onClose();

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive close calls without errors', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      for (let i = 0; i < 100; i++) {
        component.onClose();
      }

      expect(closeSpy).toHaveBeenCalledTimes(100);
    });

    it('should maintain icon references after multiple accesses', () => {
      const xBefore = component.XIcon;
      const heartBefore = component.HeartIcon;

      for (let i = 0; i < 10; i++) {
        expect(component.XIcon).toBe(xBefore);
        expect(component.HeartIcon).toBe(heartBefore);
      }
    });

    it('should maintain the kofiUrl reference after multiple accesses', () => {
      const urlBefore = component.kofiUrl;
      expect(component.kofiUrl).toBe(urlBefore);
      expect(component.kofiUrl).toBe(urlBefore);
    });

    it('should work with a different sanitizer return value', () => {
      const altSafeUrl = { changingDetector: true } as unknown as SafeResourceUrl;
      const altSanitizer = {
        bypassSecurityTrustResourceUrl: vi.fn().mockReturnValue(altSafeUrl),
      } as unknown as DomSanitizer;

      const altComponent = TestBed.runInInjectionContext(() => {
        return new SupportModalComponent(altSanitizer);
      });
      expect(altComponent.kofiUrl).toBe(altSafeUrl);
    });

    it('should not call sanitizer methods after construction', () => {
      vi.clearAllMocks();

      component.onClose();
      component.onClose();

      expect(mockSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
    });

    it('should have the close output defined', () => {
      expect(component.close).toBeDefined();
    });

    it('should have the close output as subscribable', () => {
      expect(typeof component.close.subscribe).toBe('function');
    });

    it('should not emit close during construction', () => {
      const spy = vi.fn();
      const newSanitizer = {
        bypassSecurityTrustResourceUrl: vi.fn().mockReturnValue(MOCK_SAFE_URL),
      } as unknown as DomSanitizer;

      const newComponent = TestBed.runInInjectionContext(() => {
        return new SupportModalComponent(newSanitizer);
      });
      newComponent.close.subscribe(spy);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Component Properties', () => {
    it('should have kofiUrl as a non-null value', () => {
      expect(component.kofiUrl).not.toBeNull();
      expect(component.kofiUrl).not.toBeUndefined();
    });

    it('should have XIcon as a non-null value', () => {
      expect(component.XIcon).not.toBeNull();
      expect(component.XIcon).not.toBeUndefined();
    });

    it('should have HeartIcon as a non-null value', () => {
      expect(component.HeartIcon).not.toBeNull();
      expect(component.HeartIcon).not.toBeUndefined();
    });
  });
});
