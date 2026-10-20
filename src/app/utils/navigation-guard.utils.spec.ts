import { describe, it, expect, vi } from 'vitest';
import { NavigationGuardState } from './navigation-guard.utils';

describe('NavigationGuardState', () => {
  it('should initialize with showModal false and pendingNavigation null', () => {
    const guard = new NavigationGuardState();
    expect(guard.showModal()).toBe(false);
    expect(guard.pendingNavigation()).toBeNull();
  });

  describe('triggerWarning', () => {
    it('should show modal and store callback when hasChanges is true', () => {
      const guard = new NavigationGuardState();
      const onLeave = vi.fn();

      const result = guard.triggerWarning(true, onLeave);

      expect(result).toBe(true);
      expect(guard.showModal()).toBe(true);
      expect(guard.pendingNavigation()).toBe(onLeave);
    });

    it('should not show modal or store callback when hasChanges is false', () => {
      const guard = new NavigationGuardState();
      const onLeave = vi.fn();

      const result = guard.triggerWarning(false, onLeave);

      expect(result).toBe(false);
      expect(guard.showModal()).toBe(false);
      expect(guard.pendingNavigation()).toBeNull();
    });
  });

  describe('confirmLeave', () => {
    it('should execute pending navigation callback and reset state', () => {
      const guard = new NavigationGuardState();
      const onLeave = vi.fn();

      guard.triggerWarning(true, onLeave);
      expect(guard.showModal()).toBe(true);

      guard.confirmLeave();

      expect(onLeave).toHaveBeenCalledTimes(1);
      expect(guard.showModal()).toBe(false);
      expect(guard.pendingNavigation()).toBeNull();
    });

    it('should handle null pending navigation gracefully', () => {
      const guard = new NavigationGuardState();
      expect(() => guard.confirmLeave()).not.toThrow();
      expect(guard.showModal()).toBe(false);
      expect(guard.pendingNavigation()).toBeNull();
    });
  });

  describe('stay', () => {
    it('should close modal and clear pending navigation without executing it', () => {
      const guard = new NavigationGuardState();
      const onLeave = vi.fn();

      guard.triggerWarning(true, onLeave);
      expect(guard.showModal()).toBe(true);

      guard.stay();

      expect(onLeave).not.toHaveBeenCalled();
      expect(guard.showModal()).toBe(false);
      expect(guard.pendingNavigation()).toBeNull();
    });
  });
});
