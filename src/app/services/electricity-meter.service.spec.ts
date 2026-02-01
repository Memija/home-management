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
    });
});
