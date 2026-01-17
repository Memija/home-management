import { Component, input, output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Plus, Trash2, Settings, TriangleAlert, Lock, LockOpen, Download, Upload } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HeatingRoomConfig, HeatingRoomsService } from '../../services/heating-rooms.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-heating-rooms-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './heating-rooms-modal.component.html',
  styleUrl: './heating-rooms-modal.component.scss'
})
export class HeatingRoomsModalComponent {
  private languageService = inject(LanguageService);
  private roomsService = inject(HeatingRoomsService);

  protected readonly XIcon = X;
  protected readonly PlusIcon = Plus;
  protected readonly DeleteIcon = Trash2;
  protected readonly SettingsIcon = Settings;
  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly LockIcon = Lock;
  protected readonly LockOpenIcon = LockOpen;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;

  // Inputs
  show = input.required<boolean>();
  rooms = input.required<HeatingRoomConfig[]>();
  maxRooms = input<number>(10);
  roomsWithDataArray = input<string[]>([]); // Room IDs that have data

  // Cached version of roomsWithData - stored when modal opens to avoid reactivity issues
  private cachedRoomsWithData = signal<Set<string>>(new Set());

  readonly MAX_ROOM_NAME_LENGTH = 125;

  // Outputs
  save = output<HeatingRoomConfig[]>();
  cancel = output<void>();

  // Local editing state (copy of rooms for editing)
  protected editingRooms = signal<HeatingRoomConfig[]>([]);
  protected hasChanges = signal(false);

  // Lock state: tracks which rooms with data have been unlocked for editing
  protected unlockedRooms = signal<Set<string>>(new Set());
  protected pendingUnlockRoomId = signal<string | null>(null);

  // Discard warning
  protected showDiscardWarning = signal(false);

  // Computed
  protected canAddRoom = computed(() => this.editingRooms().length < this.maxRooms());

  protected canRemoveRoom = computed(() => this.editingRooms().length > 0);

  protected hasErrors = computed(() => {
    return this.editingRooms().length === 0 || this.editingRooms().some(r => this.getRoomError(r.name));
  });

  protected trackByRoom = (_index: number, room: HeatingRoomConfig) => room.id;

  // Check if a room is locked (has data but not unlocked)
  protected isLocked(id: string): boolean {
    return this.cachedRoomsWithData().has(id) && !this.unlockedRooms().has(id);
  }

  // Check if room has data (for showing padlock)
  protected hasData(id: string): boolean {
    return this.cachedRoomsWithData().has(id);
  }

  // Request unlock (shows warning confirmation)
  protected requestUnlock(id: string): void {
    this.pendingUnlockRoomId.set(id);
  }

  // Confirm unlock after warning
  protected confirmUnlock(): void {
    const roomId = this.pendingUnlockRoomId();
    if (roomId) {
      this.unlockedRooms.update(set => {
        const newSet = new Set(set);
        newSet.add(roomId);
        return newSet;
      });
    }
    this.pendingUnlockRoomId.set(null);
  }

  // Cancel unlock
  protected cancelUnlock(): void {
    this.pendingUnlockRoomId.set(null);
  }

  // Lock a room again
  protected lockRoom(id: string): void {
    this.unlockedRooms.update(set => {
      const newSet = new Set(set);
      newSet.delete(id);
      return newSet;
    });
  }

  constructor() {
    // Initialize editingRooms when modal opens (show becomes true)
    effect(() => {
      if (this.show()) {
        this.onModalShow();
      }
    });
  }

  // Predefined room name translation keys
  private readonly PREDEFINED_ROOM_KEYS = [
    'HEATING.ROOM_LIVING_ROOM', 'HEATING.ROOM_BEDROOM', 'HEATING.ROOM_KIDS_ROOM', 'HEATING.ROOM_KITCHEN',
    'HEATING.ROOM_BATHROOM', 'HEATING.ROOM_OFFICE', 'HEATING.ROOM_GUEST_ROOM', 'HEATING.ROOM_DINING_ROOM',
    'HEATING.ROOM_HALLWAY', 'HEATING.ROOM_ATTIC'
  ];

  // Reset editing state when modal opens
  protected onModalShow(): void {
    // Cache roomsWithData before any other state changes - the input may get reset
    const dataArray = this.roomsWithDataArray();
    this.cachedRoomsWithData.set(new Set(dataArray));

    this.editingRooms.set([...this.rooms().map(r => ({ ...r }))]);
    this.hasChanges.set(false);
    this.unlockedRooms.set(new Set()); // Reset unlock state when modal opens
    this.pendingUnlockRoomId.set(null);
  }

  // Tooltip message for disabled add button
  protected maxRoomsMessage = computed(() =>
    this.languageService.translate('HEATING.MAX_ROOMS_REACHED', { max: this.maxRooms() }));

  protected addRoom(): void {
    if (!this.canAddRoom()) return;

    const existingIds = this.editingRooms().map(r => r.id);
    let newId = '';
    let counter = 1;
    do {
      newId = `room_${counter}`;
      counter++;
    } while (existingIds.includes(newId));

    // Get next predefined name from translation, or fallback to Room N
    const roomIndex = this.editingRooms().length;
    const roomName = roomIndex < this.PREDEFINED_ROOM_KEYS.length
      ? this.languageService.translate(this.PREDEFINED_ROOM_KEYS[roomIndex])
      : `Room ${roomIndex + 1}`;

    this.editingRooms.update(rooms => [...rooms, {
      id: newId,
      name: roomName
    }]);
    this.hasChanges.set(true);
  }

  protected removeRoom(id: string): void {
    if (!this.canRemoveRoom()) return;
    this.editingRooms.update(rooms => rooms.filter(r => r.id !== id));
    this.hasChanges.set(true);
  }

  protected updateRoomName(id: string, name: string): void {
    this.editingRooms.update(rooms =>
      rooms.map(r => r.id === id ? { ...r, name } : r)
    );
    this.hasChanges.set(true);
  }

  protected getRoomError(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'HEATING.ERROR_ROOM_NAME_REQUIRED';
    }
    if (name.length > this.MAX_ROOM_NAME_LENGTH) {
      return 'HEATING.ERROR_ROOM_NAME_TOO_LONG';
    }
    // Check for at least one alphanumeric character (prevent only special chars)
    // This allows special chars as long as there is at least one letter or number
    if (!/[a-zA-Z0-9]/.test(name)) {
      return 'HEATING.ERROR_ROOM_NAME_INVALID_CHARS';
    }
    return null;
  }

  protected onSave(): void {
    // Validate - trim names and ensure non-empty
    if (this.hasErrors()) return;

    const validated = this.editingRooms().map(r => ({
      ...r,
      name: r.name.trim()
    }));
    this.save.emit(validated);
  }

  protected onCancel(): void {
    if (this.hasChanges()) {
      this.showDiscardWarning.set(true);
    } else {
      this.cancel.emit();
    }
  }

  protected confirmDiscard(): void {
    this.showDiscardWarning.set(false);
    this.cancel.emit();
  }

  protected cancelDiscard(): void {
    this.showDiscardWarning.set(false);
  }

  // Export configuration
  protected exportConfiguration(): void {
    this.roomsService.exportRooms();
  }

  // Import configuration
  protected async importConfiguration(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const result = await this.roomsService.importRooms(file);
    if (result.success) {
      // Refresh local state with imported data
      this.editingRooms.set([...this.roomsService.rooms().map(r => ({ ...r }))]);
      this.hasChanges.set(true);
    } else {
      alert(result.error); // Simple error display for now
    }
    input.value = ''; // Reset for re-import
  }
}
