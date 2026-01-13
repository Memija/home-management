import { TestBed } from '@angular/core/testing';
import { HouseholdService } from './household.service';
import { STORAGE_SERVICE } from './storage.service';
import { NotificationService } from './notification.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('HouseholdService', () => {
  let service: HouseholdService;
  let mockStorageService: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockStorageService = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      setHouseholdMembers: vi.fn(),
      setAddress: vi.fn(),
    };

    // Mock crypto.randomUUID
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: vi.fn().mockReturnValue('mock-uuid') },
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [
        HouseholdService,
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });

    service = TestBed.inject(HouseholdService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created and load data', async () => {
    expect(service).toBeTruthy();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockStorageService.load).toHaveBeenCalledWith('household_members');
    expect(mockStorageService.load).toHaveBeenCalledWith('household_address');
  });

  it('should add member', () => {
    service.addMember('John', 'Doe', 'adult', 'male');
    expect(service.members().length).toBe(1);
    expect(service.members()[0]).toEqual(expect.objectContaining({
      id: 'mock-uuid',
      name: 'John',
      surname: 'Doe',
      type: 'adult',
      gender: 'male'
    }));
  });

  it('should remove member', () => {
    // Manually set initial members to avoid relying on addMember logic implicitly or randomness
    const member = {
      id: '1', name: 'John', surname: 'Doe', type: 'adult' as const, gender: 'male' as const, avatar: 'img.jpg'
    };
    service.updateMembers([member]);

    service.removeMember('1');
    expect(service.members().length).toBe(0);
  });

  it('should update address', () => {
    const address = { streetName: 'Main St', streetNumber: '1', city: 'City', zipCode: '12345', country: 'Country' };
    service.updateAddress(address);
    expect(service.address()).toEqual(address);
  });

  it('should update specific member', () => {
    const member = {
      id: '1', name: 'John', surname: 'Doe', type: 'adult' as const, gender: 'male' as const, avatar: 'img.jpg'
    };
    service.updateMembers([member]);

    service.updateMember('1', { name: 'Jane' });
    expect(service.members()[0].name).toBe('Jane');
    expect(service.members()[0].surname).toBe('Doe');
  });

  it('should save data when updated (effects)', async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); // wait for load
    // Initialization sets isInitialized = true

    service.updateMembers([]);
    await new Promise(resolve => setTimeout(resolve, 50)); // wait for effect

    expect(mockStorageService.save).toHaveBeenCalledWith('household_members', []);
    expect(mockNotificationService.setHouseholdMembers).toHaveBeenCalledWith([]);

    const address = { streetName: 'Main St', streetNumber: '1', city: 'City', zipCode: '12345', country: 'Country' };
    service.updateAddress(address);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockStorageService.save).toHaveBeenCalledWith('household_address', address);
    expect(mockNotificationService.setAddress).toHaveBeenCalledWith(address);
  });

  it('should not save during initialization load', async () => {
    // Create new TestBed context to test initialization specifically
    vi.clearAllMocks(); // Clear load calls from beforeEach

    mockStorageService.load.mockImplementation((key: string) => {
      if (key === 'household_members') return Promise.resolve([{ id: '1' }]);
      return Promise.resolve(null);
    });

    // Re-inject to trigger constructor
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        HouseholdService,
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });
    service = TestBed.inject(HouseholdService);

    // Wait for loadData
    await new Promise(resolve => setTimeout(resolve, 50));

    // We expect save NOT to be called because it's the initial load.
    expect(mockStorageService.save).not.toHaveBeenCalled();

    // Now update
    service.addMember('A', 'B', 'adult', 'male');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockStorageService.save).toHaveBeenCalled();
  });
});
