import { Injectable, signal, computed, inject } from '@angular/core';
import { STORAGE_SERVICE } from './storage.service';
import { LanguageService } from './language.service';

/**
 * Configuration for a heating room
 */
export interface HeatingRoomConfig {
  id: string;      // Unique identifier (e.g., 'room_1')
  name: string;    // Display name (e.g., 'Living Room')
  type?: string;   // Room type key for icon matching (e.g., 'HEATING.ROOM_LIVING_ROOM')
}

const STORAGE_KEY = 'heating_room_configuration';
const MAX_ROOMS = 10;

// Predefined room name translation keys
export const PREDEFINED_ROOM_KEYS = [
  'HEATING.ROOM_LIVING_ROOM', 'HEATING.ROOM_BEDROOM', 'HEATING.ROOM_KIDS_ROOM', 'HEATING.ROOM_KITCHEN',
  'HEATING.ROOM_BATHROOM', 'HEATING.ROOM_OFFICE', 'HEATING.ROOM_GUEST_ROOM', 'HEATING.ROOM_DINING_ROOM',
  'HEATING.ROOM_HALLWAY', 'HEATING.ROOM_ATTIC'
];

@Injectable({
  providedIn: 'root'
})
export class HeatingRoomsService {
  private storage = inject(STORAGE_SERVICE);
  private languageService = inject(LanguageService);

  // Room configurations signal
  private _rooms = signal<HeatingRoomConfig[]>([]);
  readonly rooms = this._rooms.asReadonly();

  constructor() {
    this.loadRooms();
  }

  // Computed helpers
  readonly roomCount = computed(() => this._rooms().length);
  readonly canAddRoom = computed(() => this._rooms().length < MAX_ROOMS);
  readonly canRemoveRoom = computed(() => this._rooms().length > 0);

  private async loadRooms(): Promise<void> {
    const stored = await this.storage.load<HeatingRoomConfig[]>(STORAGE_KEY);

    if (stored && Array.isArray(stored)) {
      this._rooms.set(stored);
    }
  }

  private saveRooms(): void {
    // Fire and forget save
    this.storage.save(STORAGE_KEY, this._rooms());
  }

  /**
   * Add a new room with auto-generated ID
   */
  addRoom(): void {
    if (!this.canAddRoom()) return;

    const existingIds = this._rooms().map(r => r.id);
    let newId = '';
    let counter = 1;
    do {
      newId = `room_${counter}`;
      counter++;
    } while (existingIds.includes(newId));

    // Get next predefined name from translation, or fallback to Room N
    const roomIndex = this._rooms().length;
    const isPredefined = roomIndex < PREDEFINED_ROOM_KEYS.length;
    const roomName = isPredefined
      ? this.languageService.translate(PREDEFINED_ROOM_KEYS[roomIndex])
      : `Room ${roomIndex + 1}`;

    const type = isPredefined ? PREDEFINED_ROOM_KEYS[roomIndex] : undefined;

    this._rooms.update(rooms => [...rooms, {
      id: newId,
      name: roomName,
      type
    }]);
    this.saveRooms();
  }

  /**
   * Remove a room by ID
   */
  removeRoom(id: string): void {
    if (!this.canRemoveRoom()) return;

    this._rooms.update(rooms => rooms.filter(r => r.id !== id));
    this.saveRooms();
  }

  /**
   * Update a room's name
   */
  updateRoomName(id: string, name: string): void {
    this._rooms.update(rooms =>
      rooms.map(r => r.id === id ? { ...r, name: name.trim() || r.name } : r)
    );
    this.saveRooms();
  }

  /**
   * Get room by ID
   */
  getRoom(id: string): HeatingRoomConfig | undefined {
    return this._rooms().find(r => r.id === id);
  }

  /**
   * Reset to default (no rooms)
   */
  reset(): void {
    this._rooms.set([]);
    this.saveRooms();
  }

  /**
   * Set all rooms at once (for modal save)
   */
  setRooms(rooms: HeatingRoomConfig[]): void {
    this._rooms.set(rooms);
    this.saveRooms();
  }

  /**
   * Export room configuration to JSON file
   */
  exportRooms(): void {
    const rooms = this._rooms();
    const dataStr = JSON.stringify(rooms, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'heating-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import room configuration from JSON file
   * Returns true if successful, false if validation failed
   */
  async importRooms(file: File): Promise<{ success: boolean; error?: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!Array.isArray(data)) {
        return { success: false, error: 'Invalid format: expected an array of rooms' };
      }

      // Validate each room
      for (let i = 0; i < data.length; i++) {
        const room = data[i];
        if (!room.id || typeof room.id !== 'string') {
          return { success: false, error: `Room ${i + 1}: Missing or invalid 'id'` };
        }
        if (!room.name || typeof room.name !== 'string') {
          return { success: false, error: `Room ${i + 1}: Missing or invalid 'name'` };
        }
      }

      // Apply the imported rooms
      this._rooms.set(data as HeatingRoomConfig[]);
      this.saveRooms();
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to parse file' };
    }
  }
}
