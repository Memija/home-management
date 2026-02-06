import { TestBed } from '@angular/core/testing';
import { ElectricityMeterService } from './electricity-meter.service';
import { LocalStorageService } from './local-storage.service';
import { ElectricityRecord } from '../models/records.model';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ElectricityMeterService', () => {
  let service: ElectricityMeterService;
  let mockLocalStorageService: any;

  beforeEach(() => {
    // 1. Create the mock object
    mockLocalStorageService = {
      getPreference: vi.fn(),
      setPreference: vi.fn()
    };

    // 2. Configure the TestBed
    TestBed.configureTestingModule({
      providers: [
        ElectricityMeterService,
        { provide: LocalStorageService, useValue: mockLocalStorageService }
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      // Need to inject inside test or beforeEach after configureTestingModule
      service = TestBed.inject(ElectricityMeterService);
      expect(service).toBeTruthy();
    });

    it('should initialize signals from localStorage', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'electricity_confirmed_meter_changes') return JSON.stringify(['2023-01-01']);
        if (key === 'electricity_dismissed_meter_changes') return JSON.stringify(['2023-01-02']);
        return null;
      });

      service = TestBed.inject(ElectricityMeterService);

      expect(service.confirmedMeterChanges()).toEqual(['2023-01-01']);
      expect(service.dismissedMeterChanges()).toEqual(['2023-01-02']);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      mockLocalStorageService.getPreference.mockReturnValue('invalid-json');

      service = TestBed.inject(ElectricityMeterService);

      expect(service.confirmedMeterChanges()).toEqual([]);
      expect(service.dismissedMeterChanges()).toEqual([]);
    });

    it('should handle null/empty localStorage', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);

      service = TestBed.inject(ElectricityMeterService);

      expect(service.confirmedMeterChanges()).toEqual([]);
      expect(service.dismissedMeterChanges()).toEqual([]);
    });
  });

  describe('detectMeterChanges', () => {
    beforeEach(() => {
      service = TestBed.inject(ElectricityMeterService);
    });

    it('should return empty array for empty records', () => {
      const records: ElectricityRecord[] = [];
      const changes = service.detectMeterChanges(records);
      expect(changes).toEqual([]);
    });

    it('should return empty array for single record', () => {
      const records: ElectricityRecord[] = [{ date: new Date('2023-01-01'), value: 100 }];
      const changes = service.detectMeterChanges(records);
      expect(changes).toEqual([]);
    });

    it('should not detect changes when values are increasing', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 110 },
        { date: new Date('2023-01-03'), value: 120 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes).toEqual([]);
    });

    it('should detect a single drop', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 50 }, // Drop here
        { date: new Date('2023-01-03'), value: 60 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
      expect(changes[0]).toBe(new Date('2023-01-02').toISOString());
    });

    it('should detect multiple drops', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 50 }, // First drop
        { date: new Date('2023-01-03'), value: 20 }  // Second drop
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(2);
      expect(changes[0]).toBe(new Date('2023-01-02').toISOString());
      expect(changes[1]).toBe(new Date('2023-01-03').toISOString());
    });
  });

  describe('filterUnconfirmed', () => {
    beforeEach(() => {
      // Setup mock return for "confirmed" and "dismissed" signals simulation via localStorage
      // Note: Since these are signals initialized in constructor, we need to mock what they load or manually update them if possible.
      // However, the service public API allows update via confirm/dismiss.
      // Easier approach: Just instantiate service, calls confirm/dismiss to set state, then test filter.
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = TestBed.inject(ElectricityMeterService);
    });

    it('should return all changes if none are confirmed or dismissed', () => {
      const changes = ['d1', 'd2'];
      expect(service.filterUnconfirmed(changes)).toEqual(['d1', 'd2']);
    });

    it('should filter out confirmed changes', () => {
      service.confirmMeterChange('d1');
      const changes = ['d1', 'd2'];
      expect(service.filterUnconfirmed(changes)).toEqual(['d2']);
    });

    it('should filter out dismissed changes', () => {
      service.dismissMeterChange('d2');
      const changes = ['d1', 'd2'];
      expect(service.filterUnconfirmed(changes)).toEqual(['d1']);
    });

    it('should filter out both confirmed and dismissed changes', () => {
      service.confirmMeterChange('d1');
      service.dismissMeterChange('d2');
      const changes = ['d1', 'd2', 'd3'];
      expect(service.filterUnconfirmed(changes)).toEqual(['d3']);
    });
  });

  describe('State Management (confirm/dismiss)', () => {
    beforeEach(() => {
      service = TestBed.inject(ElectricityMeterService);
    });

    it('should update signal and save to localStorage when confirming', () => {
      const date = '2023-01-01';
      service.confirmMeterChange(date);

      expect(service.confirmedMeterChanges()).toContain(date);
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'electricity_confirmed_meter_changes',
        expect.stringContaining(date)
      );
    });

    it('should update signal and save to localStorage when dismissing', () => {
      const date = '2023-01-02';
      service.dismissMeterChange(date);

      expect(service.dismissedMeterChanges()).toContain(date);
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'electricity_dismissed_meter_changes',
        expect.stringContaining(date)
      );
    });

    it('should append to existing confirmations', () => {
      service.confirmMeterChange('date1');
      service.confirmMeterChange('date2');

      expect(service.confirmedMeterChanges()).toEqual(['date1', 'date2']);
    });

    it('should append to existing dismissals', () => {
      service.dismissMeterChange('date1');
      service.dismissMeterChange('date2');

      expect(service.dismissedMeterChanges()).toEqual(['date1', 'date2']);
    });

    it('should save both confirmed and dismissed to localStorage on confirm', () => {
      service.confirmMeterChange('date1');

      // saveMeterChanges saves both arrays
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'electricity_confirmed_meter_changes',
        JSON.stringify(['date1'])
      );
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'electricity_dismissed_meter_changes',
        JSON.stringify([])
      );
    });

    it('should save both confirmed and dismissed to localStorage on dismiss', () => {
      service.dismissMeterChange('date1');

      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'electricity_confirmed_meter_changes',
        JSON.stringify([])
      );
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'electricity_dismissed_meter_changes',
        JSON.stringify(['date1'])
      );
    });

    it('should allow confirming multiple dates in sequence', () => {
      service.confirmMeterChange('2023-01-01');
      service.confirmMeterChange('2023-02-01');
      service.confirmMeterChange('2023-03-01');

      expect(service.confirmedMeterChanges()).toEqual([
        '2023-01-01',
        '2023-02-01',
        '2023-03-01'
      ]);
    });

    it('should allow dismissing multiple dates in sequence', () => {
      service.dismissMeterChange('2023-01-01');
      service.dismissMeterChange('2023-02-01');
      service.dismissMeterChange('2023-03-01');

      expect(service.dismissedMeterChanges()).toEqual([
        '2023-01-01',
        '2023-02-01',
        '2023-03-01'
      ]);
    });

    it('should allow confirming and dismissing different dates', () => {
      service.confirmMeterChange('2023-01-01');
      service.dismissMeterChange('2023-02-01');
      service.confirmMeterChange('2023-03-01');

      expect(service.confirmedMeterChanges()).toEqual(['2023-01-01', '2023-03-01']);
      expect(service.dismissedMeterChanges()).toEqual(['2023-02-01']);
    });

    it('should handle duplicate confirmations (adds duplicates)', () => {
      service.confirmMeterChange('2023-01-01');
      service.confirmMeterChange('2023-01-01');

      // Current implementation adds duplicates - testing actual behavior
      expect(service.confirmedMeterChanges()).toEqual(['2023-01-01', '2023-01-01']);
    });

    it('should handle duplicate dismissals (adds duplicates)', () => {
      service.dismissMeterChange('2023-01-01');
      service.dismissMeterChange('2023-01-01');

      // Current implementation adds duplicates - testing actual behavior
      expect(service.dismissedMeterChanges()).toEqual(['2023-01-01', '2023-01-01']);
    });
  });

  describe('detectMeterChanges - additional edge cases', () => {
    beforeEach(() => {
      service = TestBed.inject(ElectricityMeterService);
    });

    it('should not detect changes when values are equal', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 100 },
        { date: new Date('2023-01-03'), value: 100 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes).toEqual([]);
    });

    it('should handle very large values', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 99999999 },
        { date: new Date('2023-01-02'), value: 100000000 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes).toEqual([]);
    });

    it('should handle very large value drops', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100000000 },
        { date: new Date('2023-01-02'), value: 100 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
    });

    it('should handle decimal values', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100.50 },
        { date: new Date('2023-01-02'), value: 110.75 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes).toEqual([]);
    });

    it('should detect drop with decimal values', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100.50 },
        { date: new Date('2023-01-02'), value: 100.49 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
    });

    it('should handle zero values', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 0 },
        { date: new Date('2023-01-02'), value: 10 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes).toEqual([]);
    });

    it('should detect drop to zero', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 0 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
    });

    it('should handle two records with drop', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 50 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
      expect(changes[0]).toBe(new Date('2023-01-02').toISOString());
    });

    it('should detect drop followed by increase', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 50 },  // Drop
        { date: new Date('2023-01-03'), value: 150 }  // Increase
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
      expect(changes[0]).toBe(new Date('2023-01-02').toISOString());
    });

    it('should detect increase followed by drop', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 50 },
        { date: new Date('2023-01-02'), value: 100 }, // Increase
        { date: new Date('2023-01-03'), value: 80 }   // Drop
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
      expect(changes[0]).toBe(new Date('2023-01-03').toISOString());
    });

    it('should return ISO string format for dates', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-06-15T10:30:00'), value: 100 },
        { date: new Date('2023-06-16T14:45:00'), value: 50 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle records in order without sorting', () => {
      // Service expects records in chronological order
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 110 },
        { date: new Date('2023-01-03'), value: 90 }  // Drop
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(1);
    });

    it('should handle many consecutive drops', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 80 },
        { date: new Date('2023-01-03'), value: 60 },
        { date: new Date('2023-01-04'), value: 40 },
        { date: new Date('2023-01-05'), value: 20 }
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(4);
    });

    it('should handle alternating increases and drops', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-02'), value: 50 },  // Drop
        { date: new Date('2023-01-03'), value: 80 },  // Increase
        { date: new Date('2023-01-04'), value: 30 },  // Drop
        { date: new Date('2023-01-05'), value: 60 }   // Increase
      ];
      const changes = service.detectMeterChanges(records);
      expect(changes.length).toBe(2);
    });
  });

  describe('filterUnconfirmed - additional edge cases', () => {
    beforeEach(() => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = TestBed.inject(ElectricityMeterService);
    });

    it('should return empty array when changes array is empty', () => {
      const changes: string[] = [];
      expect(service.filterUnconfirmed(changes)).toEqual([]);
    });

    it('should return empty array when all changes are confirmed', () => {
      service.confirmMeterChange('d1');
      service.confirmMeterChange('d2');
      const changes = ['d1', 'd2'];
      expect(service.filterUnconfirmed(changes)).toEqual([]);
    });

    it('should return empty array when all changes are dismissed', () => {
      service.dismissMeterChange('d1');
      service.dismissMeterChange('d2');
      const changes = ['d1', 'd2'];
      expect(service.filterUnconfirmed(changes)).toEqual([]);
    });

    it('should handle changes not in confirmed or dismissed lists', () => {
      service.confirmMeterChange('other1');
      service.dismissMeterChange('other2');
      const changes = ['d1', 'd2'];
      expect(service.filterUnconfirmed(changes)).toEqual(['d1', 'd2']);
    });

    it('should preserve order of unconfirmed changes', () => {
      service.confirmMeterChange('d2');
      const changes = ['d1', 'd2', 'd3', 'd4'];
      expect(service.filterUnconfirmed(changes)).toEqual(['d1', 'd3', 'd4']);
    });

    it('should handle single change that is confirmed', () => {
      service.confirmMeterChange('d1');
      const changes = ['d1'];
      expect(service.filterUnconfirmed(changes)).toEqual([]);
    });

    it('should handle single change that is dismissed', () => {
      service.dismissMeterChange('d1');
      const changes = ['d1'];
      expect(service.filterUnconfirmed(changes)).toEqual([]);
    });

    it('should handle single unconfirmed change', () => {
      const changes = ['d1'];
      expect(service.filterUnconfirmed(changes)).toEqual(['d1']);
    });

    it('should handle mixed confirmed and dismissed filtering correctly', () => {
      service.confirmMeterChange('c1');
      service.confirmMeterChange('c2');
      service.dismissMeterChange('d1');
      service.dismissMeterChange('d2');
      const changes = ['c1', 'd1', 'u1', 'c2', 'u2', 'd2', 'u3'];
      expect(service.filterUnconfirmed(changes)).toEqual(['u1', 'u2', 'u3']);
    });

    it('should handle ISO date strings correctly', () => {
      const isoDate = new Date('2023-06-15T10:30:00').toISOString();
      service.confirmMeterChange(isoDate);
      const changes = [isoDate, 'other-date'];
      expect(service.filterUnconfirmed(changes)).toEqual(['other-date']);
    });
  });

  describe('Initialization - additional edge cases', () => {
    it('should handle empty arrays in localStorage', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'electricity_confirmed_meter_changes') return JSON.stringify([]);
        if (key === 'electricity_dismissed_meter_changes') return JSON.stringify([]);
        return null;
      });

      service = TestBed.inject(ElectricityMeterService);

      expect(service.confirmedMeterChanges()).toEqual([]);
      expect(service.dismissedMeterChanges()).toEqual([]);
    });

    it('should handle arrays with multiple values in localStorage', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'electricity_confirmed_meter_changes') return JSON.stringify(['a', 'b', 'c']);
        if (key === 'electricity_dismissed_meter_changes') return JSON.stringify(['x', 'y', 'z']);
        return null;
      });

      service = TestBed.inject(ElectricityMeterService);

      expect(service.confirmedMeterChanges()).toEqual(['a', 'b', 'c']);
      expect(service.dismissedMeterChanges()).toEqual(['x', 'y', 'z']);
    });

    it('should handle undefined return from localStorage', () => {
      mockLocalStorageService.getPreference.mockReturnValue(undefined);

      service = TestBed.inject(ElectricityMeterService);

      expect(service.confirmedMeterChanges()).toEqual([]);
      expect(service.dismissedMeterChanges()).toEqual([]);
    });

    it('should handle partially invalid JSON gracefully', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'electricity_confirmed_meter_changes') return JSON.stringify(['valid']);
        if (key === 'electricity_dismissed_meter_changes') return 'invalid-json';
        return null;
      });

      service = TestBed.inject(ElectricityMeterService);

      expect(service.confirmedMeterChanges()).toEqual(['valid']);
      expect(service.dismissedMeterChanges()).toEqual([]);
    });

    it('should handle object instead of array in localStorage', () => {
      mockLocalStorageService.getPreference.mockReturnValue(JSON.stringify({ key: 'value' }));

      service = TestBed.inject(ElectricityMeterService);

      // JSON.parse will succeed but result won't be an array - testing actual behavior
      // The service doesn't validate the type, so it will use whatever is parsed
      const confirmed = service.confirmedMeterChanges();
      expect(confirmed).toBeDefined();
    });
  });
});
