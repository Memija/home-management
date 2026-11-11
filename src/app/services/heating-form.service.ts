import { Injectable, signal, computed, inject } from '@angular/core';
import { DynamicHeatingRecord, getIsoDateKey, parseSafeDate } from '../models/records.model';
import { HeatingRoomsService } from './heating-rooms.service';

@Injectable({
  providedIn: 'root',
})
export class HeatingFormService {
  private readonly roomsService = inject(HeatingRoomsService);

  // Form State - dynamic room values by room ID
  readonly selectedDate = signal<string>('');
  readonly roomValues = signal<Record<string, number | null>>({});
  readonly editingRecord = signal<DynamicHeatingRecord | null>(null);

  // Validation - at least one configured room must have a value
  readonly hasValidInput = computed(() => {
    const values = this.roomValues();
    const rooms = this.roomsService.rooms();
    return rooms.some((room) => values[room.id] !== null && values[room.id] !== undefined);
  });

  // Get room display name from config
  getRoomDisplayName(roomId: string): string {
    const roomConfig = this.roomsService.rooms().find((r) => r.id === roomId);
    return roomConfig?.name || roomId;
  }

  // Get value for a specific room
  getRoomValue(roomId: string): number | null {
    return this.roomValues()[roomId] ?? null;
  }

  isDateDuplicate(records: DynamicHeatingRecord[]): boolean {
    if (this.editingRecord()) return false;
    const selected = this.selectedDate();
    if (!selected) return false;
    return records.some((r) => getIsoDateKey(r.date) === selected);
  }

  // Actions
  startEdit(record: DynamicHeatingRecord) {
    this.editingRecord.set(record);
    this.selectedDate.set(getIsoDateKey(record.date));
    // Load room values from record
    this.roomValues.set({ ...record.rooms });
  }

  cancelEdit() {
    this.editingRecord.set(null);
    this.selectedDate.set('');
    this.roomValues.set({});
  }

  updateField(roomId: string, value: number | null) {
    this.roomValues.update((values) => ({
      ...values,
      [roomId]: value,
    }));
  }

  updateDate(date: string) {
    this.selectedDate.set(date);
  }

  createRecordFromState(): DynamicHeatingRecord | null {
    if (!this.selectedDate()) return null;

    const rooms: Record<string, number> = {};
    const configuredRooms = this.roomsService.rooms();
    const values = this.roomValues();

    // Only include values for configured rooms
    for (const room of configuredRooms) {
      rooms[room.id] = values[room.id] || 0;
    }

    return {
      date: parseSafeDate(this.selectedDate()),
      rooms,
    };
  }
}
