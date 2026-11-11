import { WritableSignal } from '@angular/core';

export interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
}

export interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => void;
  mozCancelFullScreen?: () => void;
  msExitFullscreen?: () => void;
}

/**
 * Returns true when the document is currently in native or webkit fullscreen mode.
 */
export function isDocumentFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as unknown as FullscreenDocument).webkitFullscreenElement
  );
}

/**
 * Exits native or webkit fullscreen mode if active.
 */
export function exitDocumentFullscreen(): void {
  if (document.exitFullscreen) {
    void document.exitFullscreen();
  } else if ((document as unknown as FullscreenDocument).webkitExitFullscreen) {
    (document as unknown as FullscreenDocument).webkitExitFullscreen?.();
  }
}

/**
 * Returns true when the native Fullscreen API is supported on the given element.
 * iOS Safari does not support it at all; most Android browsers do.
 */
export function isNativeFullscreenSupported(el: HTMLElement | undefined): boolean {
  return !!(
    el &&
    (el.requestFullscreen ||
      (el as unknown as FullscreenElement).webkitRequestFullscreen ||
      (el as unknown as FullscreenElement).mozRequestFullScreen ||
      (el as unknown as FullscreenElement).msRequestFullscreen)
  );
}

/**
 * Enters CSS fake-fullscreen mode when native fullscreen is unavailable or fails.
 */
export function enterFakeFullscreen(
  el: HTMLElement | undefined,
  isFullscreen: WritableSignal<boolean>,
  onAfterChange: () => void,
): void {
  el?.classList.add('chart-fake-fullscreen');
  isFullscreen.set(true);
  document.body.style.overflow = 'hidden';
  onAfterChange();
}

/**
 * Toggles chart fullscreen state (native Fullscreen API with CSS fake-fullscreen fallback).
 */
export function toggleChartFullscreen(
  el: HTMLElement | undefined,
  isFullscreen: WritableSignal<boolean>,
  isControlsHidden: WritableSignal<boolean>,
  onAfterChange: () => void,
): void {
  const isCurrentlyNative = isDocumentFullscreen();
  const isCurrentlyFake = isFullscreen() && !isCurrentlyNative;

  if (isCurrentlyNative) {
    exitDocumentFullscreen();
    return;
  }

  if (isCurrentlyFake) {
    el?.classList.remove('chart-fake-fullscreen');
    isFullscreen.set(false);
    isControlsHidden.set(false);
    document.body.style.overflow = '';
    onAfterChange();
    return;
  }

  if (isNativeFullscreenSupported(el)) {
    const request =
      el?.requestFullscreen?.bind(el) ??
      (el as unknown as FullscreenElement)?.webkitRequestFullscreen?.bind(el) ??
      (el as unknown as FullscreenElement)?.mozRequestFullScreen?.bind(el) ??
      (el as unknown as FullscreenElement)?.msRequestFullscreen?.bind(el);

    if (request) {
      Promise.resolve(request()).catch((err: unknown) => {
        console.error('Failed to enter fullscreen, falling back to CSS mode:', err);
        enterFakeFullscreen(el, isFullscreen, onAfterChange);
      });
      return;
    }
  }

  enterFakeFullscreen(el, isFullscreen, onAfterChange);
}

/**
 * Cleans up any active native or CSS fake-fullscreen state on component destruction.
 */
export function cleanupChartFullscreen(el: HTMLElement | undefined): void {
  if (isDocumentFullscreen()) {
    exitDocumentFullscreen();
  }

  if (el?.classList.contains('chart-fake-fullscreen')) {
    el.classList.remove('chart-fake-fullscreen');
    document.body.style.overflow = '';
  }
}
