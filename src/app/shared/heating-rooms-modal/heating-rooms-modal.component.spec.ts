import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeatingRoomsModalComponent } from './heating-rooms-modal.component';
import { HeatingRoomsService } from '../../services/heating-rooms.service';
import { LanguageService } from '../../services/language.service';
import { signal, WritableSignal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('HeatingRoomsModalComponent', () => {
  let component: HeatingRoomsModalComponent;
  let fixture: ComponentFixture<HeatingRoomsModalComponent>;
  let mockLanguageService: {
    translate: ReturnType<typeof vi.fn>;
    currentLang: WritableSignal<string>;
  };
  let mockRoomsService: {
    exportRooms: ReturnType<typeof vi.fn>;
    importRooms: ReturnType<typeof vi.fn>;
    rooms: WritableSignal<{ id: string; name: string; type?: string }[]>;
  };

  beforeEach(async () => {
    mockLanguageService = {
      translate: vi.fn((key: string) => key),
      currentLang: signal('en'),
    };

    mockRoomsService = {
      exportRooms: vi.fn(),
      importRooms: vi.fn(),
      rooms: signal([]),
    };

    await TestBed.configureTestingModule({
      imports: [HeatingRoomsModalComponent],
      providers: [
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: HeatingRoomsService, useValue: mockRoomsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeatingRoomsModalComponent);
    component = fixture.componentInstance;

    component.show = false;
    component.rooms = [];
    component.maxRooms = 5;
    component.roomsWithDataArray = [];

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization and modal show', () => {
    it('should initialize editingRooms and cache roomsWithData on modal show', () => {
      const initialRooms = [{ id: '1', name: 'Living Room' }];
      component.rooms = initialRooms;
      component.roomsWithDataArray = ['1'];

      component['onModalShow']();

      expect(component['editingRooms']()).toEqual(initialRooms);
      expect(component['editingRooms']()).not.toBe(initialRooms);
      expect(component['cachedRoomsWithData']().has('1')).toBe(true);
      expect(component['hasChanges']()).toBe(false);
    });
  });

  describe('Room validation', () => {
    beforeEach(() => {
      component.rooms = [
        { id: '1', name: 'Room 1' },
        { id: '2', name: 'Room 2' },
      ];
      component['onModalShow']();
    });

    it('should return error for empty room name', () => {
      expect(component['getRoomError']('   ')).toBe('HEATING.ERROR_ROOM_NAME_REQUIRED');
    });

    it('should return error for invalid chars', () => {
      expect(component['getRoomError']('!@#$')).toBe('HEATING.ERROR_ROOM_NAME_INVALID_CHARS');
    });

    it('should return error for name exceeding maximum length', () => {
      const longName = 'a'.repeat(component.MAX_ROOM_NAME_LENGTH + 1);
      expect(component['getRoomError'](longName)).toBe('HEATING.ERROR_ROOM_NAME_TOO_LONG');
    });

    it('should return null for valid room name', () => {
      expect(component['getRoomError']('Valid Name')).toBeNull();
    });
  });

  describe('Adding and removing rooms', () => {
    beforeEach(() => {
      component.rooms = [{ id: '1', name: 'Room 1' }];
      component.maxRooms = 2;
      component['onModalShow']();
    });

    it('should add a new room if below maxRooms limit', () => {
      component['addRoom']();

      const rooms = component['editingRooms']();
      expect(rooms.length).toBe(2);
      expect(component['hasChanges']()).toBe(true);
      expect(component['canAddRoom']()).toBe(false);
    });

    it('should not add a room if maxRooms limit is reached', () => {
      component['addRoom']();
      component['addRoom']();

      expect(component['editingRooms']().length).toBe(2);
    });

    it('should remove a room', () => {
      component['removeRoom']('1');

      expect(component['editingRooms']().length).toBe(0);
      expect(component['hasChanges']()).toBe(true);
    });
  });

  describe('Lock and unlock state', () => {
    beforeEach(() => {
      component.rooms = [{ id: '1', name: 'Room 1' }];
      component.roomsWithDataArray = ['1'];
      component['onModalShow']();
    });

    it('should correctly identify locked rooms from cached data', () => {
      expect(component['isLocked']('1')).toBe(true);
      expect(component['hasData']('1')).toBe(true);
    });

    it('should unlock room when confirmed', () => {
      component['requestUnlock']('1');
      expect(component['pendingUnlockRoomId']()).toBe('1');

      component['confirmUnlock']();
      expect(component['isLocked']('1')).toBe(false);
      expect(component['pendingUnlockRoomId']()).toBeNull();
    });

    it('should cancel unlock request', () => {
      component['requestUnlock']('1');
      component['cancelUnlock']();
      expect(component['isLocked']('1')).toBe(true);
      expect(component['pendingUnlockRoomId']()).toBeNull();
    });

    it('should lock an unlocked room again', () => {
      component['requestUnlock']('1');
      component['confirmUnlock']();
      expect(component['isLocked']('1')).toBe(false);

      component['lockRoom']('1');
      expect(component['isLocked']('1')).toBe(true);
    });
  });

  describe('Discard warning and saving', () => {
    beforeEach(() => {
      component.rooms = [{ id: '1', name: 'Room 1' }];
      component['onModalShow']();
    });

    it('should emit cancel immediately if no changes', () => {
      vi.spyOn(component.cancelModal, 'emit');

      component['onCancel']();

      expect(component['showDiscardWarning']()).toBe(false);
      expect(component.cancelModal.emit).toHaveBeenCalled();
    });

    it('should show discard warning if changes exist', () => {
      vi.spyOn(component.cancelModal, 'emit');

      component['hasChanges'].set(true);
      component['onCancel']();

      expect(component['showDiscardWarning']()).toBe(true);
      expect(component.cancelModal.emit).not.toHaveBeenCalled();

      component['cancelDiscard']();
      expect(component['showDiscardWarning']()).toBe(false);
      expect(component.cancelModal.emit).not.toHaveBeenCalled();

      component['hasChanges'].set(true);
      component['onCancel']();
      component['confirmDiscard']();

      expect(component['showDiscardWarning']()).toBe(false);
      expect(component.cancelModal.emit).toHaveBeenCalled();
    });

    it('should emit save with trimmed names if no errors', () => {
      vi.spyOn(component.save, 'emit');

      component['editingRooms'].set([{ id: '1', name: '   Room 1   ' }]);
      component['onSave']();

      expect(component.save.emit).toHaveBeenCalledWith([{ id: '1', name: 'Room 1' }]);
    });

    it('should not emit save if there are errors', () => {
      vi.spyOn(component.save, 'emit');

      component['editingRooms'].set([{ id: '1', name: '' }]);
      component['onSave']();

      expect(component.save.emit).not.toHaveBeenCalled();
    });
  });

  describe('Import/Export', () => {
    it('should trigger exportRooms from service', () => {
      component['exportConfiguration']();
      expect(mockRoomsService.exportRooms).toHaveBeenCalled();
    });

    it('should handle file import', async () => {
      const file = new File([''], 'test.json');
      const mockEvent = {
        target: {
          files: [file],
          value: 'test.json',
        },
      } as unknown as Event;

      mockRoomsService.importRooms.mockResolvedValue({ success: true });
      mockRoomsService.rooms.set([{ id: 'imported_1', name: 'Imported Room' }]);

      await component['importConfiguration'](mockEvent);

      expect(mockRoomsService.importRooms).toHaveBeenCalledWith(file);
      expect(component['editingRooms']()[0].id).toBe('imported_1');
      expect(component['hasChanges']()).toBe(true);
      expect((mockEvent.target as HTMLInputElement).value).toBe('');
    });

    it('should alert on file import failure', async () => {
      const badFile = new File([''], 'bad.json');
      const mockEvent = {
        target: {
          files: [badFile],
          value: 'bad.json',
        },
      } as unknown as Event;

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

      mockRoomsService.importRooms.mockResolvedValue({ success: false, error: 'Bad file format' });

      await component['importConfiguration'](mockEvent);

      expect(alertSpy).toHaveBeenCalledWith('Bad file format');
      expect(component['hasChanges']()).toBe(false);
    });
  });

  describe('Help modal', () => {
    it('should toggle help modal', () => {
      expect(component['showHelpModal']()).toBe(false);

      component['showHelp']();
      expect(component['showHelpModal']()).toBe(true);

      component['closeHelp']();
      expect(component['showHelpModal']()).toBe(false);
    });
  });
});
