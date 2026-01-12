import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockLocalStorage: any;
  let mockMatchMedia: any;
  let mockMediaQueryList: any;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock matchMedia
    mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockMatchMedia = vi.fn().mockReturnValue(mockMediaQueryList);
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true
    });

    // Mock document attributes
    document.documentElement.setAttribute = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupService = (platformId: any = 'browser') => {
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: PLATFORM_ID, useValue: platformId }
      ]
    });
    return TestBed.inject(ThemeService);
  };

  it('should be created and default to system', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    service = setupService();
    expect(service).toBeTruthy();
    expect(service.currentTheme()).toBe('system');
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('should load theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    service = setupService();
    expect(service.currentTheme()).toBe('dark');
    expect(service.resolvedTheme()).toBe('dark');
  });

  it('should resolve system theme correctly (light)', () => {
    mockLocalStorage.getItem.mockReturnValue('system');
    mockMediaQueryList.matches = false; // Light preference
    service = setupService();
    expect(service.resolvedTheme()).toBe('light');
  });

  it('should resolve system theme correctly (dark)', () => {
    mockLocalStorage.getItem.mockReturnValue('system');
    mockMediaQueryList.matches = true; // Dark preference
    service = setupService();
    expect(service.resolvedTheme()).toBe('dark');
  });

  it('should apply theme to document', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    service = setupService();
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('should set theme and update storage', () => {
    service = setupService();
    service.setTheme('dark');
    expect(service.currentTheme()).toBe('dark');
    expect(service.resolvedTheme()).toBe('dark');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hm_theme', 'dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('should toggle theme', () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    service = setupService();

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
  });

  it('should handle system theme change', () => {
    mockLocalStorage.getItem.mockReturnValue('system');
    mockMediaQueryList.matches = false; // Initially light
    service = setupService();

    // Verify initial
    expect(service.resolvedTheme()).toBe('light');

    // Simulate change event
    const listener = mockMediaQueryList.addEventListener.mock.calls[0][1];
    listener({ matches: true } as MediaQueryListEvent); // System changes to dark

    expect(service.resolvedTheme()).toBe('dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('should not update if system theme changes but user overrides', () => {
    mockLocalStorage.getItem.mockReturnValue('light'); // User overrides to light
    mockMediaQueryList.matches = true; // System is dark
    service = setupService();

    expect(service.resolvedTheme()).toBe('light');

    // Simulate change event
    const listener = mockMediaQueryList.addEventListener.mock.calls[0][1];
    listener({ matches: false } as MediaQueryListEvent); // System changes to light

    // Should stay light because user preference is set
    expect(service.resolvedTheme()).toBe('light');
  });

  it('should handle non-browser environment', () => {
    service = setupService('server');

    expect(service.currentTheme()).toBe('light'); // Fallback default

    service.setTheme('dark');
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    expect(document.documentElement.setAttribute).not.toHaveBeenCalled();
  });
});
