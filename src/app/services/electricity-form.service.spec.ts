import { TestBed } from '@angular/core/testing';
import { ElectricityFormService } from './electricity-form.service';
import { ElectricityRecord } from '../models/records.model';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ElectricityFormService', () => {
  let service: ElectricityFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ElectricityFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have empty string for selectedDate', () => {
      expect(service.selectedDate()).toBe('');
    });

    it('should have null for value', () => {
      expect(service.value()).toBeNull();
    });

    it('should have null for editingRecord', () => {
      expect(service.editingRecord()).toBeNull();
    });

    it('should have hasValidInput as false', () => {
      expect(service.hasValidInput()).toBe(false);
    });
  });

  describe('hasValidInput', () => {
    it('should return false when value is null', () => {
      service.updateValue(null);
      expect(service.hasValidInput()).toBe(false);
    });

    it('should return true when value is 0', () => {
      service.updateValue(0);
      expect(service.hasValidInput()).toBe(true);
    });

    it('should return true when value is positive', () => {
      service.updateValue(100);
      expect(service.hasValidInput()).toBe(true);
    });

    it('should return false when value is negative', () => {
      service.updateValue(-1);
      expect(service.hasValidInput()).toBe(false);
    });

    it('should return true for very large numbers', () => {
      service.updateValue(999999999);
      expect(service.hasValidInput()).toBe(true);
    });

    it('should return true for decimal values', () => {
      service.updateValue(123.456);
      expect(service.hasValidInput()).toBe(true);
    });
  });

  describe('updateDate', () => {
    it('should update the selected date', () => {
      service.updateDate('2023-01-01');
      expect(service.selectedDate()).toBe('2023-01-01');
    });

    it('should handle empty string', () => {
      service.updateDate('2023-01-01');
      service.updateDate('');
      expect(service.selectedDate()).toBe('');
    });

    it('should handle date string in ISO format', () => {
      service.updateDate('2023-12-31');
      expect(service.selectedDate()).toBe('2023-12-31');
    });
  });

  describe('updateValue', () => {
    it('should update the value', () => {
      service.updateValue(100);
      expect(service.value()).toBe(100);
    });

    it('should handle null', () => {
      service.updateValue(100);
      service.updateValue(null);
      expect(service.value()).toBeNull();
    });

    it('should handle zero', () => {
      service.updateValue(0);
      expect(service.value()).toBe(0);
    });

    it('should handle decimal values', () => {
      service.updateValue(123.456);
      expect(service.value()).toBe(123.456);
    });
  });

  describe('startEdit', () => {
    it('should set state from record', () => {
      const record: ElectricityRecord = {
        date: new Date('2023-01-15'),
        value: 250
      };

      service.startEdit(record);

      expect(service.editingRecord()).toEqual(record);
      expect(service.selectedDate()).toBe('2023-01-15');
      expect(service.value()).toBe(250);
    });

    it('should handle record with zero value', () => {
      const record: ElectricityRecord = {
        date: new Date('2023-06-01'),
        value: 0
      };

      service.startEdit(record);

      expect(service.editingRecord()).toEqual(record);
      expect(service.value()).toBe(0);
    });

    it('should handle record with date having time component', () => {
      const record: ElectricityRecord = {
        date: new Date('2023-03-15T14:30:00Z'),
        value: 500
      };

      service.startEdit(record);

      // Should extract just the date portion
      expect(service.selectedDate()).toBe('2023-03-15');
    });

    it('should overwrite previous editing state', () => {
      const firstRecord: ElectricityRecord = {
        date: new Date('2023-01-01'),
        value: 100
      };
      const secondRecord: ElectricityRecord = {
        date: new Date('2023-02-01'),
        value: 200
      };

      service.startEdit(firstRecord);
      service.startEdit(secondRecord);

      expect(service.editingRecord()).toEqual(secondRecord);
      expect(service.selectedDate()).toBe('2023-02-01');
      expect(service.value()).toBe(200);
    });
  });

  describe('cancelEdit', () => {
    it('should reset editing state', () => {
      const record: ElectricityRecord = {
        date: new Date('2023-01-01'),
        value: 100
      };
      service.startEdit(record);

      service.cancelEdit();

      expect(service.editingRecord()).toBeNull();
      expect(service.selectedDate()).toBe('');
      expect(service.value()).toBeNull();
    });

    it('should reset state even when not editing', () => {
      service.updateDate('2023-05-01');
      service.updateValue(500);

      service.cancelEdit();

      expect(service.selectedDate()).toBe('');
      expect(service.value()).toBeNull();
    });
  });

  describe('isDateDuplicate', () => {
    it('should return false when no date is selected', () => {
      expect(service.isDateDuplicate([])).toBe(false);
    });

    it('should return false when passed empty records array', () => {
      service.updateDate('2023-01-01');
      expect(service.isDateDuplicate([])).toBe(false);
    });

    it('should return false when editing an existing record', () => {
      const record: ElectricityRecord = {
        date: new Date('2023-01-01'),
        value: 100
      };
      service.startEdit(record);

      expect(service.isDateDuplicate([record])).toBe(false);
    });

    it('should return true when date exists in records', () => {
      const existingRecord: ElectricityRecord = {
        date: new Date('2023-01-01'),
        value: 100
      };
      service.updateDate('2023-01-01');

      expect(service.isDateDuplicate([existingRecord])).toBe(true);
    });

    it('should return false when date does not exist in records', () => {
      const existingRecord: ElectricityRecord = {
        date: new Date('2023-01-01'),
        value: 100
      };
      service.updateDate('2023-01-02');

      expect(service.isDateDuplicate([existingRecord])).toBe(false);
    });

    it('should handle records with time component in date', () => {
      const existingRecord: ElectricityRecord = {
        date: new Date('2023-01-01T14:30:00Z'),
        value: 100
      };
      service.updateDate('2023-01-01');

      expect(service.isDateDuplicate([existingRecord])).toBe(true);
    });

    it('should check against multiple records', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-02-01'), value: 200 },
        { date: new Date('2023-03-01'), value: 300 }
      ];

      service.updateDate('2023-02-01');
      expect(service.isDateDuplicate(records)).toBe(true);

      service.updateDate('2023-04-01');
      expect(service.isDateDuplicate(records)).toBe(false);
    });

    it('should handle records at year boundaries', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2022-12-31'), value: 100 },
        { date: new Date('2023-01-01'), value: 200 }
      ];

      service.updateDate('2022-12-31');
      expect(service.isDateDuplicate(records)).toBe(true);

      service.updateDate('2023-01-01');
      expect(service.isDateDuplicate(records)).toBe(true);
    });
  });

  describe('createRecordFromState', () => {
    it('should return null when no date is selected', () => {
      service.updateValue(100);
      expect(service.createRecordFromState()).toBeNull();
    });

    it('should return null when value is null', () => {
      service.updateDate('2023-01-01');
      expect(service.createRecordFromState()).toBeNull();
    });

    it('should return null when value is negative', () => {
      service.updateDate('2023-01-01');
      service.updateValue(-10);
      expect(service.createRecordFromState()).toBeNull();
    });

    it('should create record when date and valid value are set', () => {
      service.updateDate('2023-01-01');
      service.updateValue(100);

      const result = service.createRecordFromState();

      expect(result).toBeTruthy();
      expect(result?.date).toEqual(new Date('2023-01-01'));
      expect(result?.value).toBe(100);
    });

    it('should create record with zero value', () => {
      service.updateDate('2023-01-01');
      service.updateValue(0);

      const result = service.createRecordFromState();

      expect(result).toBeTruthy();
      expect(result?.value).toBe(0);
    });

    it('should create record with decimal value', () => {
      service.updateDate('2023-06-15');
      service.updateValue(123.456);

      const result = service.createRecordFromState();

      expect(result).toBeTruthy();
      expect(result?.value).toBe(123.456);
    });

    it('should create record with large value', () => {
      service.updateDate('2023-12-31');
      service.updateValue(999999999);

      const result = service.createRecordFromState();

      expect(result).toBeTruthy();
      expect(result?.value).toBe(999999999);
    });

    it('should create correct Date object from date string', () => {
      service.updateDate('2023-07-04');
      service.updateValue(500);

      const result = service.createRecordFromState();

      expect(result).toBeTruthy();
      expect(result?.date.getFullYear()).toBe(2023);
      expect(result?.date.getMonth()).toBe(6); // July is month 6 (0-indexed)
      expect(result?.date.getDate()).toBe(4);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full add-cancel-add flow', () => {
      // Start adding a record
      service.updateDate('2023-01-01');
      service.updateValue(100);
      expect(service.hasValidInput()).toBe(true);

      // Cancel
      service.cancelEdit();
      expect(service.hasValidInput()).toBe(false);
      expect(service.selectedDate()).toBe('');

      // Add again
      service.updateDate('2023-02-01');
      service.updateValue(200);

      const result = service.createRecordFromState();
      expect(result?.date).toEqual(new Date('2023-02-01'));
      expect(result?.value).toBe(200);
    });

    it('should handle full edit flow', () => {
      const existingRecords: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 }
      ];

      // Start editing
      service.startEdit(existingRecords[0]);
      expect(service.isDateDuplicate(existingRecords)).toBe(false);

      // Modify value
      service.updateValue(150);
      const updatedRecord = service.createRecordFromState();

      expect(updatedRecord?.date).toEqual(new Date('2023-01-01'));
      expect(updatedRecord?.value).toBe(150);
    });

    it('should detect duplicate when switching from edit to new', () => {
      const existingRecords: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-02-01'), value: 200 }
      ];

      // Start editing first record
      service.startEdit(existingRecords[0]);
      expect(service.isDateDuplicate(existingRecords)).toBe(false);

      // Cancel and try to add new with date that exists
      service.cancelEdit();
      service.updateDate('2023-02-01');
      expect(service.isDateDuplicate(existingRecords)).toBe(true);
    });
  });
});
