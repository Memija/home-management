import { TestBed } from '@angular/core/testing';
import { NotificationService, getMotivationNotificationId } from './notification.service';
import { ConsumptionMotivationService } from './consumption-motivation.service';
import { STORAGE_SERVICE } from './storage.service';
import { DemoService } from './demo.service';
import { Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConsumptionRecord, ElectricityRecord } from '../models/records.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let dataRefreshedSubject: Subject<void>;
  let mockStorageService: {
    load: import('vitest').Mock;
    save: import('vitest').Mock;
    dataRefreshed$: Subject<void>;
  };
  let mockDemoService: { isDemoMode: import('vitest').Mock };

  beforeEach(() => {
    dataRefreshedSubject = new Subject<void>();
    mockStorageService = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      dataRefreshed$: dataRefreshedSubject,
    };

    mockDemoService = {
      isDemoMode: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: DemoService, useValue: mockDemoService },
      ],
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created and load data', async () => {
    expect(service).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for loadData
    expect(mockStorageService.load).toHaveBeenCalledWith('water_consumption_records');
    expect(mockStorageService.load).toHaveBeenCalledWith('heating_consumption_records');
    expect(mockStorageService.load).toHaveBeenCalledWith('household_address');
    expect(mockStorageService.load).toHaveBeenCalledWith('household_members');
    expect(mockStorageService.load).toHaveBeenCalledWith('dismissed_notifications');
  });

  it('should not show notifications until data is loaded', () => {
    service['isDataLoaded'].set(false);
    expect(service.notifications()).toEqual([]);
  });

  it('should show initial notifications when no data exists', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const notifications = service.notifications();
    const ids = notifications.map((n) => n.id);

    expect(ids).toContain('water-initial');
    expect(ids).toContain('heating-initial');
    expect(ids).toContain('address-missing');
    expect(ids).toContain('family-missing');
  });

  it('should not show notifications in demo mode', async () => {
    mockDemoService.isDemoMode.mockReturnValue(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const notifications = service.notifications();
    expect(notifications).toHaveLength(0);
  });

  it('should update notifications when data is set', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Initially has water-initial
    expect(service.notifications().some((n) => n.id === 'water-initial')).toBe(true);

    // Set water records
    service.setWaterRecords([
      { date: new Date(), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 },
    ]);

    // Check again
    expect(service.notifications().some((n) => n.id === 'water-initial')).toBe(false);
  });

  it('should detect water due (at average interval)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 3-day average interval (less than previous 7-day min)
    // Last entry was 3 days ago (at average, should show "due")
    const records: ConsumptionRecord[] = [
      {
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        kitchenWarm: 0,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0,
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
      {
        date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        kitchenWarm: 0,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0,
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
    ];
    // Avg gap: 3 days. Due threshold: floor(3) = 3 days.
    // Days since last (3 days ago) = 3.
    // 3 >= 3 -> Due.

    service.setWaterRecords(records);

    const notifications = service.notifications();
    expect(notifications.some((n) => n.id === 'water-due')).toBe(true);
    expect(notifications.some((n) => n.id === 'water-overdue')).toBe(false);
  });

  it('should detect water overdue (significantly late)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 2-day average interval
    // Overdue threshold: max(2 * 1.5, 10) = 10 days
    // Last entry was 11 days ago -> Overdue
    const records: ConsumptionRecord[] = [
      {
        date: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
        kitchenWarm: 0,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0,
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
      {
        date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
        kitchenWarm: 0,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0,
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
    ];
    // Avg gap: 2 days. Overdue threshold: max(3, 10) = 10 days.
    // Days since last (11 days ago) = 11.
    // 11 > 10 -> Overdue.

    service.setWaterRecords(records);

    const notifications = service.notifications();
    expect(notifications.some((n) => n.id === 'water-overdue')).toBe(true);
    expect(notifications.find((n) => n.id === 'water-overdue')?.messageParams?.['days']).toBe(11);
  });

  it('should dismiss notification', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const id = 'water-initial';
    service.dismissNotification(id);

    const notifications = service.notifications();
    expect(notifications.some((n) => n.id === id)).toBe(false);
    expect(mockStorageService.save).toHaveBeenCalledWith('dismissed_notifications', [id]);
  });

  it('should clear dismissed notification (undismiss)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const id = 'water-initial';

    // Dismiss first
    service.dismissNotification(id);
    expect(service.notifications().some((n) => n.id === id)).toBe(false);

    // Clear dismissal
    service.clearDismissed(id);
    expect(service.notifications().some((n) => n.id === id)).toBe(true);
    expect(mockStorageService.save).toHaveBeenCalledWith('dismissed_notifications', []);
  });

  it('should reset water overdue when records added', async () => {
    // This test logic is slightly different: we just call resetWaterOverdue
    service.dismissNotification('water-overdue');
    service.resetWaterOverdue();

    expect(mockStorageService.save).toHaveBeenLastCalledWith('dismissed_notifications', []);
  });

  describe('Monthly Schedules Special Handling', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should detect monthly due when same day of next month is reached', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

      const records: ConsumptionRecord[] = [
        {
          date: new Date('2026-01-15T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
        {
          date: new Date('2026-02-15T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
      ];

      service.setWaterRecords(records);

      const notifications = service.notifications();
      expect(notifications.some((n) => n.id === 'water-due')).toBe(true);
    });

    it('should detect monthly due at the end of a shorter month', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      vi.useFakeTimers();
      // February 2026 has 28 days
      vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));

      const records: ConsumptionRecord[] = [
        {
          date: new Date('2025-12-31T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
        {
          date: new Date('2026-01-31T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
      ];

      service.setWaterRecords(records);

      const notifications = service.notifications();
      expect(notifications.some((n) => n.id === 'water-due')).toBe(true);
    });

    it('should not detect monthly due before the target date in the current month', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      vi.useFakeTimers();
      // Current date is 14th, target date is 15th
      vi.setSystemTime(new Date('2026-03-14T12:00:00Z'));

      const records: ConsumptionRecord[] = [
        {
          date: new Date('2026-01-15T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
        {
          date: new Date('2026-02-15T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
      ];

      service.setWaterRecords(records);

      const notifications = service.notifications();
      expect(notifications.some((n) => n.id === 'water-due')).toBe(false);
    });

    it('should not detect monthly due before the end of a shorter month', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      vi.useFakeTimers();
      // February 2026 has 28 days, checking on the 27th (target was 31st)
      vi.setSystemTime(new Date('2026-02-27T12:00:00Z'));

      const records: ConsumptionRecord[] = [
        {
          date: new Date('2025-12-31T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
        {
          date: new Date('2026-01-31T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        } as Partial<ConsumptionRecord> as ConsumptionRecord,
      ];

      service.setWaterRecords(records);

      const notifications = service.notifications();
      expect(notifications.some((n) => n.id === 'water-due')).toBe(false);
    });
  });

  // Heating Tests
  it('should detect heating due (at average interval)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 3-day average interval
    const records = [
      {
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
      {
        date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
    ];
    // Avg gap: 3 days. Due threshold: 3. Days since last: 3.

    service.setHeatingRecords(records);

    const notifications = service.notifications();
    expect(notifications.some((n) => n.id === 'heating-due')).toBe(true);
  });

  it('should detect heating overdue (significantly late)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 2-day average interval
    const records = [
      {
        date: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
      {
        date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      } as Partial<ConsumptionRecord> as ConsumptionRecord,
    ];
    // Avg gap: 2 days. Overdue threshold: max(3, 10) = 10 days.
    // Days since last: 11. 11 > 10 -> Overdue.

    service.setHeatingRecords(records);

    const notifications = service.notifications();
    expect(notifications.some((n) => n.id === 'heating-overdue')).toBe(true);
    expect(notifications.find((n) => n.id === 'heating-overdue')?.messageParams?.['days']).toBe(11);
  });

  // Electricity Tests
  it('should detect electricity due (at average interval)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 3-day average interval
    // ElectricityRecord has more fields but we only need date for this test
    const records: ElectricityRecord[] = [
      {
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        value: 100,
      } as Partial<ElectricityRecord> as ElectricityRecord,
      {
        date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        value: 90,
      } as Partial<ElectricityRecord> as ElectricityRecord,
    ];
    // Avg gap: 3 days. Due threshold: 3. Days since last: 3.

    service.setElectricityRecords(records);

    const notifications = service.notifications();
    expect(notifications.some((n) => n.id === 'electricity-due')).toBe(true);
  });

  it('should detect electricity overdue (significantly late)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 2-day average interval
    const records: ElectricityRecord[] = [
      {
        date: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
        value: 100,
      } as Partial<ElectricityRecord> as ElectricityRecord,
      {
        date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
        value: 90,
      } as Partial<ElectricityRecord> as ElectricityRecord,
    ];
    // Avg gap: 2 days. Overdue threshold: max(3, 10) = 10 days.
    // Days since last: 11. 11 > 10 -> Overdue.

    service.setElectricityRecords(records);

    const notifications = service.notifications();
    expect(notifications.some((n) => n.id === 'electricity-overdue')).toBe(true);
  });

  describe('Consumption Motivation Notifications (Header)', () => {
    it('should surface initial header motivation notifications for saving, stable, and minor (< 10%) trends', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Electricity: minor saving (< 10%)
      service.setElectricityRecords([
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 295 },
      ]);

      // Heating: stable (0%)
      service.setHeatingRecords([
        { date: new Date('2026-01-01T12:00:00Z'), rooms: { living: 100 } },
        { date: new Date('2026-01-11T12:00:00Z'), rooms: { living: 200 } },
        { date: new Date('2026-01-21T12:00:00Z'), rooms: { living: 300 } },
      ]);

      const motivationNotifs = service.notifications().filter((n) => n.type === 'motivation');
      expect(motivationNotifs).toHaveLength(2);

      const heatingNotif = motivationNotifs.find((n) => n.id === 'heating-motivation');
      expect(heatingNotif).toBeDefined();
      expect(heatingNotif?.category).toBe('heating');
      expect(heatingNotif?.accent).toBe('stable');
      expect(heatingNotif?.priority).toBe('low');
      expect(heatingNotif?.titleKey).toBe('MOTIVATION.HEATING.STABLE_TITLE');
      expect(heatingNotif?.route).toBe('/dashboard/heating');

      const electricityNotif = motivationNotifs.find((n) => n.id === 'electricity-motivation');
      expect(electricityNotif).toBeDefined();
      expect(electricityNotif?.category).toBe('electricity');
      expect(electricityNotif?.accent).toBe('saving');
      expect(electricityNotif?.priority).toBe('low');
      expect(electricityNotif?.titleKey).toBe('MOTIVATION.ELECTRICITY.SAVING_TITLE');
      expect(electricityNotif?.route).toBe('/dashboard/electricity');
    });

    it('should emit medium-priority header motivation notification when usage spikes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 335 },
      ];

      service.setElectricityRecords(records);

      const motivationNotif = service
        .notifications()
        .find((n) => n.id === getMotivationNotificationId('electricity'));

      expect(motivationNotif).toBeDefined();
      expect(motivationNotif?.priority).toBe('medium');
      expect(motivationNotif?.titleKey).toBe('MOTIVATION.ELECTRICITY.SPIKE_TITLE');
    });

    it('should stay dismissed across data refreshes and tip cycling, reappearing ONLY after resetMotivationDismissal on next record input', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const motivationService = TestBed.inject(ConsumptionMotivationService);

      const initialRecords: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 270 },
      ];
      service.setElectricityRecords(initialRecords);

      const notifId = getMotivationNotificationId('electricity');
      expect(service.notifications().some((n) => n.id === notifId)).toBe(true);

      // User dismisses notification in header dropdown
      service.dismissNotification(notifId);
      expect(service.notifications().some((n) => n.id === notifId)).toBe(false);
      expect(mockStorageService.save).toHaveBeenLastCalledWith('dismissed_notifications', [
        'electricity-motivation',
      ]);

      // Tip refresh on Dashboard card or record refresh/deletion without resetMotivationDismissal must NOT re-show it
      motivationService.nextTip('electricity');
      service.setElectricityRecords([
        ...initialRecords,
        { date: new Date('2026-01-31T12:00:00Z'), value: 400 },
      ]);
      expect(service.notifications().some((n) => n.id === notifId)).toBe(false);

      // Next record input calls resetMotivationDismissal -> header notification reappears
      service.resetMotivationDismissal('electricity');
      const retriggered = service.notifications().find((n) => n.id === notifId);
      expect(retriggered).toBeDefined();
      expect(retriggered?.titleKey).toBe('MOTIVATION.ELECTRICITY.SPIKE_TITLE');
    });

    it('should surface initial motivation notifications in demo mode while suppressing overdue/initial/settings reminders', async () => {
      mockDemoService.isDemoMode.mockReturnValue(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      service.setElectricityRecords([
        { date: new Date('2025-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2025-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2025-01-21T12:00:00Z'), value: 260 },
      ]);

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe('electricity-motivation');
      expect(notifications[0].type).toBe('motivation');
    });

    it('should respect persisted motivation dismissals loaded from storage at startup', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'dismissed_notifications') {
          return ['water-motivation'];
        }
        if (key === 'water_consumption_records') {
          return [
            {
              date: '2026-01-01T12:00:00Z',
              kitchenWarm: 0,
              kitchenCold: 0,
              bathroomWarm: 0,
              bathroomCold: 0,
            },
            {
              date: '2026-01-11T12:00:00Z',
              kitchenWarm: 0,
              kitchenCold: 0,
              bathroomWarm: 0,
              bathroomCold: 1000,
            },
            {
              date: '2026-01-21T12:00:00Z',
              kitchenWarm: 0,
              kitchenCold: 0,
              bathroomWarm: 0,
              bathroomCold: 1700,
            },
          ];
        }
        if (key === 'electricity_consumption_records') {
          return [
            { date: '2026-01-01T12:00:00Z', value: 100 },
            { date: '2026-01-11T12:00:00Z', value: 200 },
            { date: '2026-01-21T12:00:00Z', value: 300 },
          ];
        }
        return null;
      });

      await service['loadData']();

      const motivationIds = service
        .notifications()
        .filter((n) => n.type === 'motivation')
        .map((n) => n.id);
      expect(motivationIds).toEqual(['electricity-motivation']);
    });

    it('should isolate resetMotivationDismissal per tracker and skip storage save when unchanged', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      service.dismissNotification('water-motivation');
      service.dismissNotification('water-motivation-saving-2026-01-21');
      service.dismissNotification('motivation-toast-water');
      service.dismissNotification('electricity-motivation');
      service.dismissNotification('water-overdue');
      mockStorageService.save.mockClear();

      // Resetting water clears only water motivation IDs
      service.resetMotivationDismissal('water');
      expect(mockStorageService.save).toHaveBeenCalledTimes(1);
      expect(mockStorageService.save).toHaveBeenCalledWith('dismissed_notifications', [
        'electricity-motivation',
        'water-overdue',
      ]);

      // Calling again when already cleared is a no-op
      mockStorageService.save.mockClear();
      service.resetMotivationDismissal('water');
      expect(mockStorageService.save).not.toHaveBeenCalled();
    });
  });

  it('should reset electricity overdue when records added', async () => {
    service.dismissNotification('electricity-overdue');
    service.resetElectricityOverdue();

    expect(mockStorageService.save).toHaveBeenLastCalledWith('dismissed_notifications', []);
  });

  it('should not save duplicate dismissal when dismissing an already dismissed notification', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    service.dismissNotification('water-initial');
    mockStorageService.save.mockClear();

    service.dismissNotification('water-initial');
    expect(mockStorageService.save).not.toHaveBeenCalled();
  });

  it('should update settings and meter change state via setters', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(service.notifications().some((n) => n.id === 'address-missing')).toBe(true);
    expect(service.notifications().some((n) => n.id === 'family-missing')).toBe(true);

    service.setAddress({
      streetName: 'Main St',
      streetNumber: '1',
      zipCode: '12345',
      city: 'Berlin',
      country: 'DE',
    });
    service.setHouseholdMembers([{ id: '1', name: 'Alice', surname: 'Smith', avatar: 'avatar1' }]);
    service.setConfirmedMeterChanges(['2026-01-10']);

    expect(service.notifications().some((n) => n.id === 'address-missing')).toBe(false);
    expect(service.notifications().some((n) => n.id === 'family-missing')).toBe(false);
  });

  it('should load heating records, confirmed meter changes, address, and family members on dataRefreshed$', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));

    mockStorageService.load.mockImplementation(async (key: string) => {
      if (key === 'heating_consumption_records') {
        return [{ date: '2026-01-01T12:00:00Z', rooms: { living: 100 } }];
      }
      if (key === 'water_confirmed_meter_changes') {
        return ['2026-01-10'];
      }
      if (key === 'household_address') {
        return {
          streetName: 'Main St',
          streetNumber: '1',
          zipCode: '12345',
          city: 'Berlin',
          country: 'DE',
        };
      }
      if (key === 'household_members') {
        return [{ id: '1', name: 'Alice', surname: 'Smith', avatar: 'avatar1' }];
      }
      return null;
    });

    dataRefreshedSubject.next();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const ids = service.notifications().map((n) => n.id);
    expect(ids).not.toContain('heating-initial');
    expect(ids).not.toContain('address-missing');
    expect(ids).not.toContain('family-missing');
  });
});
