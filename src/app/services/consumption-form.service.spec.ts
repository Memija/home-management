import { TestBed } from '@angular/core/testing';
import { ConsumptionFormService } from './consumption-form.service';
import { ConsumptionRecord } from '../models/records.model';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ConsumptionFormService', () => {
  let service: ConsumptionFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConsumptionFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial state', () => {
    expect(service.selectedDate()).toBe('');
    expect(service.kitchenWarm()).toBeNull();
    expect(service.kitchenCold()).toBeNull();
    expect(service.bathroomWarm()).toBeNull();
    expect(service.bathroomCold()).toBeNull();
    expect(service.editingRecord()).toBeNull();
    expect(service.hasValidInput()).toBe(false);
  });

  describe('updateField', () => {
    it('should update fields correctly', () => {
      service.updateField('kitchenWarm', 10);
      expect(service.kitchenWarm()).toBe(10);
      expect(service.hasValidInput()).toBe(true);

      service.updateField('kitchenCold', 20);
      expect(service.kitchenCold()).toBe(20);

      service.updateField('bathroomWarm', 30);
      expect(service.bathroomWarm()).toBe(30);

      service.updateField('bathroomCold', 40);
      expect(service.bathroomCold()).toBe(40);
    });

    it('should handle null values', () => {
      service.updateField('kitchenWarm', 10);
      service.updateField('kitchenWarm', null);
      expect(service.kitchenWarm()).toBeNull();
    });
  });

  describe('updateDate', () => {
    it('should update date', () => {
      service.updateDate('2023-01-01');
      expect(service.selectedDate()).toBe('2023-01-01');
    });
  });

  describe('startEdit', () => {
    it('should set state from record', () => {
      const record: ConsumptionRecord = {
        date: new Date('2023-01-01'),
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40
      };

      service.startEdit(record);

      expect(service.editingRecord()).toEqual(record);
      expect(service.selectedDate()).toBe('2023-01-01');
      expect(service.kitchenWarm()).toBe(10);
      expect(service.kitchenCold()).toBe(20);
      expect(service.bathroomWarm()).toBe(30);
      expect(service.bathroomCold()).toBe(40);
    });
  });

  describe('cancelEdit', () => {
    it('should reset state', () => {
      service.updateField('kitchenWarm', 10);
      service.updateDate('2023-01-01');
      service.cancelEdit();

      expect(service.editingRecord()).toBeNull();
      expect(service.selectedDate()).toBe('');
      expect(service.kitchenWarm()).toBeNull();
      expect(service.kitchenCold()).toBeNull();
      expect(service.bathroomWarm()).toBeNull();
      expect(service.bathroomCold()).toBeNull();
    });
  });

  describe('isDateDuplicate', () => {
    it('should return false if no date selected', () => {
      expect(service.isDateDuplicate([])).toBe(false);
    });

    it('should return false if editing existing record', () => {
      const record: ConsumptionRecord = {
        date: new Date('2023-01-01'),
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40
      };
      service.startEdit(record);
      expect(service.isDateDuplicate([record])).toBe(false);
    });

    it('should return true if date exists in records', () => {
      const existingRecord: ConsumptionRecord = {
        date: new Date('2023-01-01'),
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40
      };
      service.updateDate('2023-01-01');
      expect(service.isDateDuplicate([existingRecord])).toBe(true);
    });

    it('should return false if date does not exist', () => {
      const existingRecord: ConsumptionRecord = {
        date: new Date('2023-01-01'),
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40
      };
      service.updateDate('2023-01-02');
      expect(service.isDateDuplicate([existingRecord])).toBe(false);
    });
  });

  describe('createRecordFromState', () => {
    it('should return null if no date selected', () => {
      expect(service.createRecordFromState()).toBeNull();
    });

    it('should create record from state', () => {
      service.updateDate('2023-01-01');
      service.updateField('kitchenWarm', 10);
      service.updateField('bathroomCold', 40);

      const result = service.createRecordFromState();

      expect(result).toBeTruthy();
      expect(result?.date).toEqual(new Date('2023-01-01'));
      expect(result?.kitchenWarm).toBe(10);
      expect(result?.kitchenCold).toBe(0); // Default
      expect(result?.bathroomWarm).toBe(0); // Default
      expect(result?.bathroomCold).toBe(40);
    });
  });
});
