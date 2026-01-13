import { TestBed } from '@angular/core/testing';
import { HeatingFormService } from './heating-form.service';
import { HeatingRoomsService } from './heating-rooms.service';
import { DynamicHeatingRecord } from '../models/records.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';

describe('HeatingFormService', () => {
  let service: HeatingFormService;
  let mockHeatingRoomsService: any;

  beforeEach(() => {
    mockHeatingRoomsService = {
      rooms: signal([
        { id: 'room_1', name: 'Living Room' },
        { id: 'room_2', name: 'Kitchen' }
      ])
    };

    TestBed.configureTestingModule({
      providers: [
        HeatingFormService,
        { provide: HeatingRoomsService, useValue: mockHeatingRoomsService }
      ]
    });
    service = TestBed.inject(HeatingFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial state', () => {
      it('should have empty initial state', () => {
          expect(service.selectedDate()).toBe('');
          expect(service.roomValues()).toEqual({});
          expect(service.editingRecord()).toBeNull();
          expect(service.hasValidInput()).toBe(false);
      });
  });

  describe('Room Configuration', () => {
      it('should get room display name', () => {
          expect(service.getRoomDisplayName('room_1')).toBe('Living Room');
          expect(service.getRoomDisplayName('unknown')).toBe('unknown');
      });
  });

  describe('updateField', () => {
      it('should update room value', () => {
          service.updateField('room_1', 10);
          expect(service.getRoomValue('room_1')).toBe(10);
          expect(service.hasValidInput()).toBe(true);
      });

      it('should handle updates for multiple rooms', () => {
          service.updateField('room_1', 10);
          service.updateField('room_2', 20);
          expect(service.getRoomValue('room_1')).toBe(10);
          expect(service.getRoomValue('room_2')).toBe(20);
      });
  });

  describe('updateDate', () => {
      it('should update date', () => {
          service.updateDate('2023-01-01');
          expect(service.selectedDate()).toBe('2023-01-01');
      });
  });

  describe('startEdit', () => {
      it('should populate form from record', () => {
          const record: DynamicHeatingRecord = {
              date: new Date('2023-01-01'),
              rooms: {
                  'room_1': 10,
                  'room_2': 20
              }
          };

          service.startEdit(record);

          expect(service.editingRecord()).toEqual(record);
          expect(service.selectedDate()).toBe('2023-01-01');
          expect(service.getRoomValue('room_1')).toBe(10);
          expect(service.getRoomValue('room_2')).toBe(20);
      });
  });

  describe('cancelEdit', () => {
      it('should reset form', () => {
          service.updateDate('2023-01-01');
          service.updateField('room_1', 10);
          service.cancelEdit();

          expect(service.selectedDate()).toBe('');
          expect(service.roomValues()).toEqual({});
          expect(service.editingRecord()).toBeNull();
      });
  });

  describe('createRecordFromState', () => {
      it('should return null if no date', () => {
          service.updateField('room_1', 10);
          expect(service.createRecordFromState()).toBeNull();
      });

      it('should create record with only configured rooms', () => {
          service.updateDate('2023-01-01');
          service.updateField('room_1', 10);
          service.updateField('room_3', 30); // room_3 is not in config

          const record = service.createRecordFromState();

          expect(record).toBeDefined();
          expect(record?.date).toEqual(new Date('2023-01-01'));
          expect(record?.rooms['room_1']).toBe(10);
          expect(record?.rooms['room_2']).toBe(0); // Default to 0
          expect(record?.rooms['room_3']).toBeUndefined(); // Should be filtered out
      });
  });

  describe('isDateDuplicate', () => {
      it('should check for duplicates', () => {
          const record: DynamicHeatingRecord = {
              date: new Date('2023-01-01'),
              rooms: {}
          };

          service.updateDate('2023-01-01');
          expect(service.isDateDuplicate([record])).toBe(true);

          service.updateDate('2023-01-02');
          expect(service.isDateDuplicate([record])).toBe(false);
      });
  });
});
