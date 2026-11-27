import { describe, expect, it } from 'vitest';
import { getMotivationNotificationId } from './notification.model';

describe('notification.model', () => {
  it('should generate deterministic motivation notification IDs for each tracker', () => {
    expect(getMotivationNotificationId('water')).toBe('water-motivation');
    expect(getMotivationNotificationId('heating')).toBe('heating-motivation');
    expect(getMotivationNotificationId('electricity')).toBe('electricity-motivation');
  });
});
