import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMotivationNotificationId } from '../models/notification.model';
import {
  calculateReadingStatus,
  collectInitialNotifications,
  collectMotivationNotifications,
  collectReminderNotifications,
  collectSettingsNotifications,
  filterMotivationDismissals,
  isMonthlyScheduleDue,
} from './notification.utils';

describe('notification.utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getMotivationNotificationId', () => {
    it('should return deterministic motivation notification IDs for each tracker', () => {
      expect(getMotivationNotificationId('water')).toBe('water-motivation');
      expect(getMotivationNotificationId('heating')).toBe('heating-motivation');
      expect(getMotivationNotificationId('electricity')).toBe('electricity-motivation');
    });
  });

  describe('isMonthlyScheduleDue', () => {
    it('should return false when averageDays is outside monthly range (27-32)', () => {
      const lastDate = new Date('2026-01-15T12:00:00Z');
      const today = new Date('2026-02-15T12:00:00Z');

      expect(isMonthlyScheduleDue(lastDate, 14, today)).toBe(false);
      expect(isMonthlyScheduleDue(lastDate, 45, today)).toBe(false);
    });

    it('should return false when today is in the same or an earlier month than lastDate', () => {
      const lastDate = new Date('2026-02-15T12:00:00Z');
      expect(isMonthlyScheduleDue(lastDate, 30, new Date('2026-02-28T12:00:00Z'))).toBe(false);
      expect(isMonthlyScheduleDue(lastDate, 30, new Date('2026-01-31T12:00:00Z'))).toBe(false);
    });

    it('should return true on or after the same day in a later month and use default today when omitted', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));

      const lastDate = new Date('2026-01-15T12:00:00Z');
      expect(isMonthlyScheduleDue(lastDate, 30)).toBe(true);
      expect(isMonthlyScheduleDue(lastDate, 30, new Date('2026-02-14T12:00:00Z'))).toBe(false);
    });

    it('should return true on the last day of a shorter month when last reading was on 31st', () => {
      const lastDate = new Date('2026-01-31T12:00:00Z');
      expect(isMonthlyScheduleDue(lastDate, 31, new Date('2026-02-28T12:00:00Z'))).toBe(true);
      expect(isMonthlyScheduleDue(lastDate, 31, new Date('2026-02-27T12:00:00Z'))).toBe(false);
    });
  });

  describe('calculateReadingStatus', () => {
    it('should return not due and not overdue when fewer than 2 records exist', () => {
      expect(calculateReadingStatus([])).toEqual({
        isDue: false,
        isOverdue: false,
        daysSinceLast: 0,
      });
      expect(calculateReadingStatus([{ date: new Date() }])).toEqual({
        isDue: false,
        isOverdue: false,
        daysSinceLast: 0,
      });
    });

    it('should sort unsorted records and calculate due/overdue status based on average interval', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));

      // Unsorted order: latest first
      const dueRecords = [{ date: '2026-01-15T12:00:00Z' }, { date: '2026-01-10T12:00:00Z' }];
      expect(calculateReadingStatus(dueRecords)).toEqual({
        isDue: true,
        isOverdue: false,
        daysSinceLast: 5,
      });

      const overdueRecords = [{ date: '2026-01-05T12:00:00Z' }, { date: '2026-01-01T12:00:00Z' }];
      expect(calculateReadingStatus(overdueRecords)).toEqual({
        isDue: true,
        isOverdue: true,
        daysSinceLast: 15,
      });

      const recentRecords = [{ date: '2026-01-18T12:00:00Z' }, { date: '2026-01-10T12:00:00Z' }];
      expect(calculateReadingStatus(recentRecords)).toEqual({
        isDue: false,
        isOverdue: false,
        daysSinceLast: 2,
      });
    });
  });

  describe('notification collectors', () => {
    it('should collect initial notifications only for zero-length trackers that are not dismissed', () => {
      const result = collectInitialNotifications({ water: 0, heating: 2, electricity: 0 }, [
        'electricity-initial',
      ]);
      expect(result.map((n) => n.id)).toEqual(['water-initial']);
      expect(result[0]).toMatchObject({
        id: 'water-initial',
        type: 'initial',
        category: 'water',
        accent: 'water',
        titleKey: 'NOTIFICATIONS.WATER_INITIAL_TITLE',
        messageKey: 'NOTIFICATIONS.WATER_INITIAL_MESSAGE',
        priority: 'high',
        dismissible: true,
        route: '/dashboard/water',
        fragment: 'input-section',
      });
    });

    it('should collect reminder notifications for due and overdue trackers and filter dismissed ones', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));

      const recordsByTracker = {
        water: [{ date: '2026-01-10T12:00:00Z' }, { date: '2026-01-15T12:00:00Z' }],
        heating: [{ date: '2026-01-01T12:00:00Z' }, { date: '2026-01-05T12:00:00Z' }],
        electricity: [],
      };

      const result = collectReminderNotifications(recordsByTracker, []);
      expect(result.map((n) => n.id)).toEqual(['water-due', 'heating-overdue']);
      expect(result[1].messageParams).toEqual({ days: 15 });

      const withDismissed = collectReminderNotifications(recordsByTracker, [
        'water-due',
        'heating-overdue',
      ]);
      expect(withDismissed).toEqual([]);
    });

    it('should collect motivation notifications with correct priority for saving, stable, and spike states and respect dismissals', () => {
      const insights = [
        {
          tracker: 'water' as const,
          state: 'saving' as const,
          changePercent: 12,
          latestDailyRate: 100,
          baselineDailyRate: 114,
          unit: 'L',
          titleKey: 'MOTIVATION.WATER.SAVING_TITLE',
          messageKey: 'MOTIVATION.WATER.SAVING_1',
          messageParams: { percent: 12 },
          isNotable: true,
          latestDateIso: '2026-01-20',
          tipIndex: 0,
        },
        null,
        {
          tracker: 'electricity' as const,
          state: 'spike' as const,
          changePercent: 25,
          latestDailyRate: 15,
          baselineDailyRate: 12,
          unit: 'kWh',
          titleKey: 'MOTIVATION.ELECTRICITY.SPIKE_TITLE',
          messageKey: 'MOTIVATION.ELECTRICITY.SPIKE_1',
          messageParams: { percent: 25 },
          isNotable: true,
          latestDateIso: '2026-01-20',
          tipIndex: 0,
        },
      ];

      const result = collectMotivationNotifications(insights, []);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'water-motivation',
        accent: 'saving',
        priority: 'low',
      });
      expect(result[1]).toMatchObject({
        id: 'electricity-motivation',
        accent: 'spike',
        priority: 'medium',
      });

      const filtered = collectMotivationNotifications(insights, ['water-motivation']);
      expect(filtered.map((n) => n.id)).toEqual(['electricity-motivation']);
    });

    it('should collect settings notifications when address or family members are missing and respect dismissals', () => {
      expect(collectSettingsNotifications(false, false, []).map((n) => n.id)).toEqual([
        'address-missing',
        'family-missing',
      ]);
      expect(
        collectSettingsNotifications(false, false, ['address-missing']).map((n) => n.id),
      ).toEqual(['family-missing']);
      expect(collectSettingsNotifications(true, true, [])).toEqual([]);
    });
  });

  describe('filterMotivationDismissals', () => {
    it('should remove only current and legacy motivation IDs for the specified tracker', () => {
      const dismissed = [
        'water-motivation',
        'water-motivation-saving-2026-01-01',
        'motivation-toast-water',
        'electricity-motivation',
        'water-overdue',
      ];
      expect(filterMotivationDismissals(dismissed, 'water')).toEqual([
        'electricity-motivation',
        'water-overdue',
      ]);
    });
  });
});
