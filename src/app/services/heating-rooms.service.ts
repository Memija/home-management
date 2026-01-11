import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { LanguageService } from './language.service';

/**
 * Configuration for a heating room
 */
export interface HeatingRoomConfig {
  id: string;      // Unique identifier (e.g., 'room_1')
  name: string;    // Display name (e.g., 'Living Room')
}

const STORAGE_KEY = 'heating_room_configs';
const MAX_ROOMS = 10;

// Predefined room name translation keys
const PREDEFINED_ROOM_KEYS = [
  'HEATING.ROOM_LIVING_ROOM', 'HEATING.ROOM_BEDROOM', 'HEATING.ROOM_KIDS_ROOM', 'HEATING.ROOM_KITCHEN',
  'HEATING.ROOM_BATHROOM', 'HEATING.ROOM_OFFICE', 'HEATING.ROOM_GUEST_ROOM', 'HEATING.ROOM_DINING_ROOM',
  'HEATING.ROOM_HALLWAY', 'HEATING.ROOM_ATTIC'
];

@Injectable({
  providedIn: 'root'
})
export class HeatingRoomsService {
  private localStorage = inject(LocalStorageService);
  private languageService = inject(LanguageService);

  // Room configurations signal
  private _rooms = signal<HeatingRoomConfig[]>(this.loadRooms());
  readonly rooms = this._rooms.asReadonly();

  constructor() {
    // Effect to update default room name once translations are loaded
    effect(() => {
      // This dependency triggers the effect when translations change/load
      const defaultName = this.languageService.translate('HEATING.ROOM_LIVING_ROOM');

      // Update state without tracking dependencies to avoid cycles
      untracked(() => {
        const currentRooms = this._rooms();
        const defaultRoom = currentRooms.find(r => r.id === 'room_1');

        // Only update if it currently equals the translation key (meaning load failed initially)
        if (defaultRoom && defaultRoom.name === 'HEATING.ROOM_LIVING_ROOM') {
          this.updateRoomName('room_1', defaultName);
        }
      });
    });
  }

  // Computed helpers
  readonly roomCount = computed(() => this._rooms().length);
  readonly canAddRoom = computed(() => this._rooms().length < MAX_ROOMS);
  readonly canRemoveRoom = computed(() => this._rooms().length > 0);

  private getDefaultRoom(): HeatingRoomConfig {
    return {
      id: 'room_1',
      name: this.languageService.translate('HEATING.ROOM_LIVING_ROOM')
    };
  }

  private loadRooms(): HeatingRoomConfig[] {
    const stored = this.localStorage.getPreference(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Fall through to default
      }
    }
    return [];
  }

  private saveRooms(): void {
    this.localStorage.setPreference(STORAGE_KEY, JSON.stringify(this._rooms()));
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
    const roomName = roomIndex < PREDEFINED_ROOM_KEYS.length
      ? this.languageService.translate(PREDEFINED_ROOM_KEYS[roomIndex])
      : `Room ${roomIndex + 1}`;

    this._rooms.update(rooms => [...rooms, {
      id: newId,
      name: roomName
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
}
