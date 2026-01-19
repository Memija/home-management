import { Injectable, inject, computed, signal } from '@angular/core';
import { STORAGE_SERVICE } from './storage.service';
import { ConsumptionRecord } from '../models/records.model';
import { DemoService } from './demo.service';
import { Address, HouseholdMember } from './household.service';

export interface Notification {
  id: string;
  type: 'reminder' | 'initial' | 'info';
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  priority: 'high' | 'medium' | 'low';
  dismissible: boolean;
  route?: string;
  fragment?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private storage = inject(STORAGE_SERVICE);
  private demoService = inject(DemoService);

  // Data signals (will be set by consuming components or loaded)
  private waterRecords = signal<ConsumptionRecord[]>([]);
  private heatingRecords = signal<{ date: Date }[]>([]);
  private address = signal<Address | null>(null);
  private familyMembers = signal<HouseholdMember[]>([]);
  private dismissedNotifications = signal<string[]>([]);
  private isDataLoaded = signal(false);

  constructor() {
    this.loadData();
  }

  /**
   * Load all data needed for notifications
   */
  private async loadData(): Promise<void> {
    await this.loadDismissedNotifications();
    // Use correct storage keys matching the data services
    const waterRecords = await this.storage.load<ConsumptionRecord[]>('water_consumption_records');
    if (waterRecords) {
      this.waterRecords.set(waterRecords);
    }

    const heatingRecords = await this.storage.load<{ date: Date }[]>('heating_consumption_records');
    if (heatingRecords) {
      this.heatingRecords.set(heatingRecords);
    }

    // Load address and family data
    const address = await this.storage.load<Address>('household_address');
    if (address) {
      this.address.set(address);
    }

    const familyMembers = await this.storage.load<HouseholdMember[]>('household_members');
    if (familyMembers) {
      this.familyMembers.set(familyMembers);
    }

    this.isDataLoaded.set(true);
  }

  /**
   * Update records from external source (for reactivity when data changes)
   */
  setWaterRecords(records: ConsumptionRecord[]): void {
    this.waterRecords.set(records);
  }

  setHeatingRecords(records: { date: Date }[]): void {
    this.heatingRecords.set(records);
  }

  /**
   * Update address from external source
   */
  setAddress(address: Address | null): void {
    this.address.set(address);
  }

  /**
   * Update family members from external source
   */
  setHouseholdMembers(members: HouseholdMember[]): void {
    this.familyMembers.set(members);
  }

  /**
   * Get all active notifications
   */
  readonly notifications = computed<Notification[]>(() => {
    // Don't show notifications until data is loaded
    if (!this.isDataLoaded()) {
      return [];
    }

    // Don't show notifications in demo mode
    if (this.demoService.isDemoMode()) {
      return [];
    }

    const notifications: Notification[] = [];
    const dismissed = this.dismissedNotifications();

    // Check for missing initial water readings
    if (this.waterRecords().length === 0) {
      const notif: Notification = {
        id: 'water-initial',
        type: 'initial',
        titleKey: 'NOTIFICATIONS.WATER_INITIAL_TITLE',
        messageKey: 'NOTIFICATIONS.WATER_INITIAL_MESSAGE',
        priority: 'high',
        dismissible: true,
        route: '/water',
        fragment: 'input-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    // Check for missing initial heating readings
    if (this.heatingRecords().length === 0) {
      const notif: Notification = {
        id: 'heating-initial',
        type: 'initial',
        titleKey: 'NOTIFICATIONS.HEATING_INITIAL_TITLE',
        messageKey: 'NOTIFICATIONS.HEATING_INITIAL_MESSAGE',
        priority: 'high',
        dismissible: true,
        route: '/heating',
        fragment: 'input-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    // Check if water reading is due or overdue based on average frequency
    const waterStatus = this.checkWaterReadingStatus();

    // Show "due" notification when it's time for a reading
    if (waterStatus.isDue && !waterStatus.isOverdue) {
      const notif: Notification = {
        id: 'water-due',
        type: 'reminder',
        titleKey: 'NOTIFICATIONS.WATER_DUE_TITLE',
        messageKey: 'NOTIFICATIONS.WATER_DUE_MESSAGE',
        priority: 'low',
        dismissible: true,
        route: '/water',
        fragment: 'input-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    // Show "overdue" notification when significantly late
    if (waterStatus.isOverdue) {
      const notif: Notification = {
        id: 'water-overdue',
        type: 'reminder',
        titleKey: 'NOTIFICATIONS.WATER_OVERDUE_TITLE',
        messageKey: 'NOTIFICATIONS.WATER_OVERDUE_MESSAGE',
        messageParams: { days: waterStatus.daysSinceLast },
        priority: 'medium',
        dismissible: true,
        route: '/water',
        fragment: 'input-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    // Check if heating reading is due or overdue based on average frequency
    const heatingStatus = this.checkHeatingReadingStatus();

    // Show "due" notification when it's time for a heating reading
    if (heatingStatus.isDue && !heatingStatus.isOverdue) {
      const notif: Notification = {
        id: 'heating-due',
        type: 'reminder',
        titleKey: 'NOTIFICATIONS.HEATING_DUE_TITLE',
        messageKey: 'NOTIFICATIONS.HEATING_DUE_MESSAGE',
        priority: 'low',
        dismissible: true,
        route: '/heating',
        fragment: 'input-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    // Show "overdue" notification for heating when significantly late
    if (heatingStatus.isOverdue) {
      const notif: Notification = {
        id: 'heating-overdue',
        type: 'reminder',
        titleKey: 'NOTIFICATIONS.HEATING_OVERDUE_TITLE',
        messageKey: 'NOTIFICATIONS.HEATING_OVERDUE_MESSAGE',
        messageParams: { days: heatingStatus.daysSinceLast },
        priority: 'medium',
        dismissible: true,
        route: '/heating',
        fragment: 'input-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    // Check for missing address
    if (!this.address()) {
      const notif: Notification = {
        id: 'address-missing',
        type: 'initial',
        titleKey: 'NOTIFICATIONS.ADDRESS_MISSING_TITLE',
        messageKey: 'NOTIFICATIONS.ADDRESS_MISSING_MESSAGE',
        priority: 'medium',
        dismissible: true,
        route: '/settings',
        fragment: 'address-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    // Check for missing family members
    if (this.familyMembers().length === 0) {
      const notif: Notification = {
        id: 'family-missing',
        type: 'initial',
        titleKey: 'NOTIFICATIONS.FAMILY_MISSING_TITLE',
        messageKey: 'NOTIFICATIONS.FAMILY_MISSING_MESSAGE',
        priority: 'medium',
        dismissible: true,
        route: '/settings',
        fragment: 'family-section'
      };
      if (!dismissed.includes(notif.id)) {
        notifications.push(notif);
      }
    }

    return notifications;
  });

  /**
   * Calculate if water reading is due or overdue based on average entry frequency
   * @returns isDue - true when it's time for a reading (at or past average interval)
   * @returns isOverdue - true when significantly late (1.5x average interval)
   */
  private checkWaterReadingStatus(): { isDue: boolean; isOverdue: boolean; daysSinceLast: number } {
    const records = this.waterRecords();

    // Need at least 2 records to calculate average frequency
    if (records.length < 2) {
      return { isDue: false, isOverdue: false, daysSinceLast: 0 };
    }

    // Sort by date
    const sorted = [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate average days between entries
    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      totalDays += diff / (1000 * 60 * 60 * 24);
    }
    const averageDays = totalDays / (sorted.length - 1);

    // Calculate days since last entry
    const lastEntry = sorted[sorted.length - 1];
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(lastEntry.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Due when at or past average interval (with minimum of 7 days)
    // Use Math.floor to avoid floating-point precision issues (7.004 -> 7)
    const dueThreshold = Math.floor(Math.max(averageDays, 7));
    const isDue = daysSinceLast >= dueThreshold;

    // Overdue when 1.5x past the average (significantly late)
    const overdueThreshold = Math.floor(Math.max(averageDays * 1.5, 10));
    const isOverdue = daysSinceLast > overdueThreshold;

    return { isDue, isOverdue, daysSinceLast };
  }

  /**
   * Calculate if heating reading is due or overdue based on average entry frequency
   * @returns isDue - true when it's time for a reading (at or past average interval)
   * @returns isOverdue - true when significantly late (1.5x average interval)
   */
  private checkHeatingReadingStatus(): { isDue: boolean; isOverdue: boolean; daysSinceLast: number } {
    const records = this.heatingRecords();

    // Need at least 2 records to calculate average frequency
    if (records.length < 2) {
      return { isDue: false, isOverdue: false, daysSinceLast: 0 };
    }

    // Sort by date
    const sorted = [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate average days between entries
    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      totalDays += diff / (1000 * 60 * 60 * 24);
    }
    const averageDays = totalDays / (sorted.length - 1);

    // Calculate days since last entry
    const lastEntry = sorted[sorted.length - 1];
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(lastEntry.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Due when at or past average interval (with minimum of 7 days)
    // Use Math.floor to avoid floating-point precision issues
    const dueThreshold = Math.floor(Math.max(averageDays, 7));
    const isDue = daysSinceLast >= dueThreshold;

    // Overdue when 1.5x past the average (significantly late)
    const overdueThreshold = Math.floor(Math.max(averageDays * 1.5, 10));
    const isOverdue = daysSinceLast > overdueThreshold;

    return { isDue, isOverdue, daysSinceLast };
  }

  /**
   * Dismiss a notification
   */
  dismissNotification(id: string): void {
    const current = this.dismissedNotifications();
    if (!current.includes(id)) {
      const updated = [...current, id];
      this.dismissedNotifications.set(updated);
      this.saveDismissedNotifications(updated);
    }
  }

  /**
   * Clear dismissed notification (when user takes action)
   */
  clearDismissed(id: string): void {
    const current = this.dismissedNotifications();
    const updated = current.filter(n => n !== id);
    this.dismissedNotifications.set(updated);
    this.saveDismissedNotifications(updated);
  }

  /**
   * Reset water notifications (call when user adds a new water record)
   */
  resetWaterOverdue(): void {
    this.clearDismissed('water-due');
    this.clearDismissed('water-overdue');
  }

  private async loadDismissedNotifications(): Promise<void> {
    const dismissed = await this.storage.load<string[]>('dismissed_notifications');
    if (dismissed) {
      this.dismissedNotifications.set(dismissed);
    }
  }

  private saveDismissedNotifications(dismissed: string[]): void {
    this.storage.save('dismissed_notifications', dismissed);
  }
}
