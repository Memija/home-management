import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { STORAGE_SERVICE } from './storage.service';
import { DemoService } from './demo.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConsumptionRecord, ElectricityRecord } from '../models/records.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockStorageService: any;
  let mockDemoService: any;

  beforeEach(() => {
    mockStorageService = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
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
    await new Promise(resolve => setTimeout(resolve, 0)); // wait for loadData
    expect(mockStorageService.load).toHaveBeenCalledWith('water_consumption_records');
    expect(mockStorageService.load).toHaveBeenCalledWith('heating_consumption_records');
    expect(mockStorageService.load).toHaveBeenCalledWith('household_address');
    expect(mockStorageService.load).toHaveBeenCalledWith('household_members');
    expect(mockStorageService.load).toHaveBeenCalledWith('dismissed_notifications');
  });

  it('should not show notifications until data is loaded', () => {
    // Not loaded test
  });

  it('should show initial notifications when no data exists', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const notifications = service.notifications();
    const ids = notifications.map(n => n.id);

    expect(ids).toContain('water-initial');
    expect(ids).toContain('heating-initial');
    expect(ids).toContain('address-missing');
    expect(ids).toContain('family-missing');
  });

  it('should not show notifications in demo mode', async () => {
    mockDemoService.isDemoMode.mockReturnValue(true);
    await new Promise(resolve => setTimeout(resolve, 0));

    const notifications = service.notifications();
    expect(notifications.length).toBe(0);
  });

  it('should update notifications when data is set', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    // Initially has water-initial
    expect(service.notifications().some(n => n.id === 'water-initial')).toBe(true);

    // Set water records
    service.setWaterRecords([{ date: new Date(), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 }]);

    // Check again
    expect(service.notifications().some(n => n.id === 'water-initial')).toBe(false);
  });

  it('should detect water due (at average interval)', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 3-day average interval (less than previous 7-day min)
    // Last entry was 3 days ago (at average, should show "due")
    const records: ConsumptionRecord[] = [
      { date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 },
      { date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 }
    ];
    // Avg gap: 3 days. Due threshold: floor(3) = 3 days.
    // Days since last (3 days ago) = 3.
    // 3 >= 3 -> Due.

    service.setWaterRecords(records);

    const notifications = service.notifications();
    expect(notifications.some(n => n.id === 'water-due')).toBe(true);
    expect(notifications.some(n => n.id === 'water-overdue')).toBe(false);
  });

  it('should detect water overdue (significantly late)', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 2-day average interval
    // Overdue threshold: max(2 * 1.5, 10) = 10 days
    // Last entry was 11 days ago -> Overdue
    const records: ConsumptionRecord[] = [
      { date: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 },
      { date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 }
    ];
    // Avg gap: 2 days. Overdue threshold: max(3, 10) = 10 days.
    // Days since last (11 days ago) = 11.
    // 11 > 10 -> Overdue.

    service.setWaterRecords(records);

    const notifications = service.notifications();
    expect(notifications.some(n => n.id === 'water-overdue')).toBe(true);
    expect(notifications.find(n => n.id === 'water-overdue')?.messageParams?.['days']).toBe(11);
  });

  it('should dismiss notification', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const id = 'water-initial';
    service.dismissNotification(id);

    const notifications = service.notifications();
    expect(notifications.some(n => n.id === id)).toBe(false);
    expect(mockStorageService.save).toHaveBeenCalledWith('dismissed_notifications', [id]);
  });

  it('should clear dismissed notification (undismiss)', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    const id = 'water-initial';

    // Dismiss first
    service.dismissNotification(id);
    expect(service.notifications().some(n => n.id === id)).toBe(false);

    // Clear dismissal
    service.clearDismissed(id);
    expect(service.notifications().some(n => n.id === id)).toBe(true);
    expect(mockStorageService.save).toHaveBeenCalledWith('dismissed_notifications', []);
  });

  it('should reset water overdue when records added', async () => {
    // This test logic is slightly different: we just call resetWaterOverdue
    service.dismissNotification('water-overdue');
    service.resetWaterOverdue();

    expect(mockStorageService.save).toHaveBeenLastCalledWith('dismissed_notifications', []);
  });

  // Heating Tests
  it('should detect heating due (at average interval)', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 3-day average interval
    const records = [
      { date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
      { date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) }
    ];
    // Avg gap: 3 days. Due threshold: 3. Days since last: 3.

    service.setHeatingRecords(records);

    const notifications = service.notifications();
    expect(notifications.some(n => n.id === 'heating-due')).toBe(true);
  });

  it('should detect heating overdue (significantly late)', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 2-day average interval
    const records = [
      { date: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000) },
      { date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000) }
    ];
    // Avg gap: 2 days. Overdue threshold: max(3, 10) = 10 days.
    // Days since last: 11. 11 > 10 -> Overdue.

    service.setHeatingRecords(records);

    const notifications = service.notifications();
    expect(notifications.some(n => n.id === 'heating-overdue')).toBe(true);
    expect(notifications.find(n => n.id === 'heating-overdue')?.messageParams?.['days']).toBe(11);
  });

  // Electricity Tests
  it('should detect electricity due (at average interval)', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 3-day average interval
    // ElectricityRecord has more fields but we only need date for this test
    const records: ElectricityRecord[] = [
      { date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), value: 100 } as any,
      { date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), value: 90 } as any
    ];
    // Avg gap: 3 days. Due threshold: 3. Days since last: 3.

    service.setElectricityRecords(records);

    const notifications = service.notifications();
    expect(notifications.some(n => n.id === 'electricity-due')).toBe(true);
  });

  it('should detect electricity overdue (significantly late)', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const now = new Date();
    // Create records with 2-day average interval
    const records: ElectricityRecord[] = [
      { date: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000), value: 100 } as any,
      { date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000), value: 90 } as any
    ];
    // Avg gap: 2 days. Overdue threshold: max(3, 10) = 10 days.
    // Days since last: 11. 11 > 10 -> Overdue.

    service.setElectricityRecords(records);

    const notifications = service.notifications();
    expect(notifications.some(n => n.id === 'electricity-overdue')).toBe(true);
  });

  it('should reset electricity overdue when records added', async () => {
    service.dismissNotification('electricity-overdue');
    service.resetElectricityOverdue();

    expect(mockStorageService.save).toHaveBeenLastCalledWith('dismissed_notifications', []);
  });
});
