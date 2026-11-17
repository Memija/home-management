import { describe, expect, it } from 'vitest';
import {
  Droplets,
  Flame,
  Info,
  MapPin,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-angular';
import { Notification } from '../services/notification.service';
import {
  getNotificationCategoryIcon,
  getNotificationStatusIcon,
  resolveNotificationAccent,
  resolveNotificationCategory,
} from './notification-ui.utils';

function buildNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 'generic-id',
    type: 'info',
    titleKey: 'TITLE',
    messageKey: 'MSG',
    priority: 'low',
    dismissible: true,
    ...overrides,
  };
}

describe('notification-ui.utils', () => {
  describe('resolveNotificationCategory', () => {
    it('should return explicit category when present', () => {
      expect(resolveNotificationCategory(buildNotification({ category: 'heating' }))).toBe(
        'heating',
      );
    });

    it('should infer category from id, route, or fragment when omitted', () => {
      expect(resolveNotificationCategory(buildNotification({ id: 'water-due' }))).toBe('water');
      expect(resolveNotificationCategory(buildNotification({ route: '/dashboard/heating' }))).toBe(
        'heating',
      );
      expect(
        resolveNotificationCategory(buildNotification({ route: '/dashboard/electricity' })),
      ).toBe('electricity');
      expect(resolveNotificationCategory(buildNotification({ fragment: 'address-section' }))).toBe(
        'address',
      );
      expect(resolveNotificationCategory(buildNotification({ fragment: 'family-section' }))).toBe(
        'family',
      );
      expect(resolveNotificationCategory(buildNotification({ id: 'custom-note' }))).toBe('general');
    });
  });

  describe('resolveNotificationAccent', () => {
    it('should return explicit accent when present', () => {
      expect(resolveNotificationAccent(buildNotification({ accent: 'stable' }))).toBe('stable');
    });

    it('should infer motivation, reminder, initial, and info accents when omitted', () => {
      expect(
        resolveNotificationAccent(buildNotification({ type: 'motivation', priority: 'low' })),
      ).toBe('saving');
      expect(
        resolveNotificationAccent(buildNotification({ type: 'motivation', priority: 'medium' })),
      ).toBe('spike');
      expect(
        resolveNotificationAccent(buildNotification({ type: 'reminder', priority: 'low' })),
      ).toBe('warning');
      expect(
        resolveNotificationAccent(
          buildNotification({ id: 'water-overdue', type: 'reminder', priority: 'low' }),
        ),
      ).toBe('danger');
      expect(
        resolveNotificationAccent(
          buildNotification({ id: 'water-initial', type: 'initial', priority: 'high' }),
        ),
      ).toBe('water');
      expect(
        resolveNotificationAccent(
          buildNotification({ id: 'address-missing', type: 'initial', priority: 'medium' }),
        ),
      ).toBe('address');
      expect(
        resolveNotificationAccent(
          buildNotification({ id: 'family-missing', type: 'initial', priority: 'medium' }),
        ),
      ).toBe('family');
      expect(
        resolveNotificationAccent(
          buildNotification({ id: 'generic-initial', type: 'initial', priority: 'low' }),
        ),
      ).toBe('info');
      expect(resolveNotificationAccent(buildNotification({ type: 'info' }))).toBe('info');
    });
  });

  describe('getNotificationCategoryIcon', () => {
    it('should map each notification category to its domain Lucide icon', () => {
      expect(getNotificationCategoryIcon(buildNotification({ category: 'water' }))).toBe(Droplets);
      expect(getNotificationCategoryIcon(buildNotification({ category: 'heating' }))).toBe(Flame);
      expect(getNotificationCategoryIcon(buildNotification({ category: 'electricity' }))).toBe(Zap);
      expect(getNotificationCategoryIcon(buildNotification({ category: 'address' }))).toBe(MapPin);
      expect(getNotificationCategoryIcon(buildNotification({ category: 'family' }))).toBe(Users);
      expect(getNotificationCategoryIcon(buildNotification({ category: 'general' }))).toBe(Info);
    });
  });

  describe('getNotificationStatusIcon', () => {
    it('should return trend icons only for saving and spike trends and null otherwise', () => {
      expect(getNotificationStatusIcon(buildNotification({ accent: 'saving' }))).toBe(TrendingDown);
      expect(getNotificationStatusIcon(buildNotification({ accent: 'spike' }))).toBe(TrendingUp);
      expect(getNotificationStatusIcon(buildNotification({ accent: 'stable' }))).toBeNull();
      expect(getNotificationStatusIcon(buildNotification({ accent: 'warning' }))).toBeNull();
      expect(getNotificationStatusIcon(buildNotification({ accent: 'danger' }))).toBeNull();
      expect(getNotificationStatusIcon(buildNotification({ accent: 'water' }))).toBeNull();
      expect(getNotificationStatusIcon(buildNotification({ accent: 'address' }))).toBeNull();
      expect(getNotificationStatusIcon(buildNotification({ accent: 'family' }))).toBeNull();
      expect(getNotificationStatusIcon(buildNotification({ accent: 'info' }))).toBeNull();
    });
  });
});
