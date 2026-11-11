import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import {
  cleanupChartFullscreen,
  enterFakeFullscreen,
  exitDocumentFullscreen,
  FullscreenDocument,
  FullscreenElement,
  isDocumentFullscreen,
  isNativeFullscreenSupported,
  toggleChartFullscreen,
} from './chart-fullscreen.utils';

describe('chart-fullscreen.utils', () => {
  const originalExitFullscreen = document.exitFullscreen;

  beforeEach(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    delete (document as unknown as FullscreenDocument).webkitFullscreenElement;
    delete (document as unknown as FullscreenDocument).webkitExitFullscreen;
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.exitFullscreen = originalExitFullscreen;
    vi.restoreAllMocks();
  });

  describe('isDocumentFullscreen', () => {
    it('should return false when neither fullscreenElement nor webkitFullscreenElement is set', () => {
      expect(isDocumentFullscreen()).toBe(false);
    });

    it('should return true when document.fullscreenElement is set', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.createElement('div'),
        configurable: true,
      });
      expect(isDocumentFullscreen()).toBe(true);
    });

    it('should return true when document.webkitFullscreenElement is set', () => {
      (document as unknown as FullscreenDocument).webkitFullscreenElement =
        document.createElement('div');
      expect(isDocumentFullscreen()).toBe(true);
    });
  });

  describe('exitDocumentFullscreen', () => {
    it('should call document.exitFullscreen when available', () => {
      const spy = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = spy;

      exitDocumentFullscreen();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fall back to webkitExitFullscreen when exitFullscreen is unavailable', () => {
      // @ts-expect-error simulating browser without standard exitFullscreen
      document.exitFullscreen = undefined;
      const webkitSpy = vi.fn();
      (document as unknown as FullscreenDocument).webkitExitFullscreen = webkitSpy;

      exitDocumentFullscreen();
      expect(webkitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('isNativeFullscreenSupported', () => {
    it('should return false when element is undefined or has no fullscreen methods', () => {
      expect(isNativeFullscreenSupported(undefined)).toBe(false);
      const el = document.createElement('div');
      // @ts-expect-error clearing requestFullscreen for test
      el.requestFullscreen = undefined;
      expect(isNativeFullscreenSupported(el)).toBe(false);
    });

    it('should return true for standard or vendor-prefixed requestFullscreen', () => {
      const stdEl = document.createElement('div');
      stdEl.requestFullscreen = vi.fn();
      expect(isNativeFullscreenSupported(stdEl)).toBe(true);

      const webkitEl = document.createElement('div') as FullscreenElement;
      // @ts-expect-error clearing standard method
      webkitEl.requestFullscreen = undefined;
      webkitEl.webkitRequestFullscreen = vi.fn();
      expect(isNativeFullscreenSupported(webkitEl)).toBe(true);
    });
  });

  describe('enterFakeFullscreen', () => {
    it('should add CSS class, set signal to true, lock body scroll, and invoke callback', () => {
      const el = document.createElement('div');
      const isFullscreen = signal(false);
      const onAfterChange = vi.fn();

      enterFakeFullscreen(el, isFullscreen, onAfterChange);

      expect(el.classList.contains('chart-fake-fullscreen')).toBe(true);
      expect(isFullscreen()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
      expect(onAfterChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleChartFullscreen', () => {
    it('should exit native fullscreen when currently in native fullscreen', () => {
      const el = document.createElement('div');
      Object.defineProperty(document, 'fullscreenElement', {
        value: el,
        configurable: true,
      });
      const exitSpy = vi.fn();
      document.exitFullscreen = exitSpy;

      toggleChartFullscreen(el, signal(true), signal(false), vi.fn());
      expect(exitSpy).toHaveBeenCalledTimes(1);
    });

    it('should exit CSS fake fullscreen when currently in fake fullscreen', () => {
      const el = document.createElement('div');
      el.classList.add('chart-fake-fullscreen');
      document.body.style.overflow = 'hidden';
      const isFullscreen = signal(true);
      const isControlsHidden = signal(true);
      const onAfterChange = vi.fn();

      toggleChartFullscreen(el, isFullscreen, isControlsHidden, onAfterChange);

      expect(el.classList.contains('chart-fake-fullscreen')).toBe(false);
      expect(isFullscreen()).toBe(false);
      expect(isControlsHidden()).toBe(false);
      expect(document.body.style.overflow).toBe('');
      expect(onAfterChange).toHaveBeenCalledTimes(1);
    });

    it('should request native fullscreen when supported', () => {
      const el = document.createElement('div');
      const reqSpy = vi.fn().mockResolvedValue(undefined);
      el.requestFullscreen = reqSpy;

      toggleChartFullscreen(el, signal(false), signal(false), vi.fn());
      expect(reqSpy).toHaveBeenCalledTimes(1);
    });

    it('should fall back to CSS fake fullscreen when native requestFullscreen rejects', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const el = document.createElement('div');
      el.requestFullscreen = vi.fn().mockRejectedValue(new Error('Denied'));
      const isFullscreen = signal(false);
      const onAfterChange = vi.fn();

      toggleChartFullscreen(el, isFullscreen, signal(false), onAfterChange);
      await Promise.resolve();
      await Promise.resolve();

      expect(el.classList.contains('chart-fake-fullscreen')).toBe(true);
      expect(isFullscreen()).toBe(true);
      expect(onAfterChange).toHaveBeenCalledTimes(1);
    });

    it('should enter CSS fake fullscreen when native API is unsupported', () => {
      const el = document.createElement('div');
      // @ts-expect-error clearing requestFullscreen
      el.requestFullscreen = undefined;
      const isFullscreen = signal(false);
      const onAfterChange = vi.fn();

      toggleChartFullscreen(el, isFullscreen, signal(false), onAfterChange);

      expect(el.classList.contains('chart-fake-fullscreen')).toBe(true);
      expect(isFullscreen()).toBe(true);
      expect(onAfterChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupChartFullscreen', () => {
    it('should exit native fullscreen and remove fake-fullscreen class and overflow lock', () => {
      const el = document.createElement('div');
      el.classList.add('chart-fake-fullscreen');
      document.body.style.overflow = 'hidden';
      Object.defineProperty(document, 'fullscreenElement', {
        value: el,
        configurable: true,
      });
      const exitSpy = vi.fn();
      document.exitFullscreen = exitSpy;

      cleanupChartFullscreen(el);

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(el.classList.contains('chart-fake-fullscreen')).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });
  });
});
