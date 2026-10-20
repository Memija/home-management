import { signal, WritableSignal } from '@angular/core';

/**
 * Reusable helper class to manage navigation warning modal state and callbacks
 * when a user attempts to navigate away from forms with unsaved changes.
 */
export class NavigationGuardState {
  readonly showModal: WritableSignal<boolean> = signal(false);
  readonly pendingNavigation: WritableSignal<(() => void) | null> = signal(null);

  /**
   * Triggers the navigation warning if unsaved changes are present.
   * @param hasChanges Whether unsaved changes exist
   * @param onLeave Callback to execute if the user confirms leaving
   * @returns True if navigation was intercepted and warning shown, false otherwise
   */
  triggerWarning(hasChanges: boolean, onLeave: () => void): boolean {
    if (hasChanges) {
      this.pendingNavigation.set(onLeave);
      this.showModal.set(true);
      return true;
    }
    return false;
  }

  /**
   * Confirms leaving without saving changes: executes pending navigation and closes the warning modal.
   */
  confirmLeave(): void {
    const navigation = this.pendingNavigation();
    if (navigation) {
      navigation();
    }
    this.close();
  }

  /**
   * Dismisses the modal and stays on the current view to allow the user to save.
   */
  stay(): void {
    this.close();
  }

  private close(): void {
    this.showModal.set(false);
    this.pendingNavigation.set(null);
  }
}
