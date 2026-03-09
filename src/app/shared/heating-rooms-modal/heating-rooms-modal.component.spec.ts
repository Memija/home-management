import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeatingRoomsModalComponent } from './heating-rooms-modal.component';
import { HeatingRoomsService } from '../../services/heating-rooms.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform } from '@angular/core';
import { vi } from 'vitest';
import { signal } from '@angular/core';

@Pipe({
  name: 'translate',
  standalone: true
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string, args?: any): string {
    return key;
  }
}

describe('HeatingRoomsModalComponent', () => {
  let component: HeatingRoomsModalComponent;
  let fixture: ComponentFixture<HeatingRoomsModalComponent>;
  let mockLanguageService: any;
  let mockRoomsService: any;

  beforeEach(async () => {
    // Setup Service Mocks
    mockLanguageService = {
      translate: vi.fn((key: string) => key),
      currentLang: signal('en')
    };

    mockRoomsService = {
      exportRooms: vi.fn(),
      importRooms: vi.fn(),
      rooms: signal([])
    };

    await TestBed.configureTestingModule({
      imports: [HeatingRoomsModalComponent],
      providers: [
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: HeatingRoomsService, useValue: mockRoomsService }
      ]
    })
      .overrideComponent(HeatingRoomsModalComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(HeatingRoomsModalComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('show', false);
    fixture.componentRef.setInput('rooms', []);
    fixture.componentRef.setInput('maxRooms', 5);
    fixture.componentRef.setInput('roomsWithDataArray', []);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Modal opening', () => {
    it('should initialize editing state and cache roomsWithData on show', () => {
      fixture.componentRef.setInput('rooms', [{ id: '1', name: 'Living Room', baseTemp: 20, minTemp: 15, maxTemp: 25, isShared: false }]);
      fixture.componentRef.setInput('roomsWithDataArray', ['1']);

      const compAsAny = component as any;

      compAsAny.onModalShow();

      expect(compAsAny.editingRooms().length).toBe(1);
      expect(compAsAny.cachedRoomsWithData().has('1')).toBe(true);
      expect(compAsAny.hasChanges()).toBe(false);
      expect(compAsAny.unlockedRooms().size).toBe(0);
    });
  });

  describe('Room management', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rooms', [{ id: 'room_1', name: 'Room 1', baseTemp: 20, minTemp: 15, maxTemp: 25, isShared: false }]);
      const compAsAny = component as any;
      compAsAny.onModalShow();
    });

    it('should determine if room can be removed', () => {
      const compAsAny = component as any;
      expect(compAsAny.canRemoveRoom()).toBe(true);
      compAsAny.removeRoom('room_1');
      expect(compAsAny.canRemoveRoom()).toBe(false); // No rooms left
    });

    it('should add a room up to maxRooms', () => {
      const compAsAny = component as any;
      expect(compAsAny.canAddRoom()).toBe(true);

      compAsAny.addRoom();
      expect(compAsAny.editingRooms().length).toBe(2);
      expect(compAsAny.hasChanges()).toBe(true);

      // Add until maxRooms (5)
      compAsAny.addRoom();
      compAsAny.addRoom();
      compAsAny.addRoom();

      expect(compAsAny.editingRooms().length).toBe(5);
      expect(compAsAny.canAddRoom()).toBe(false);

      compAsAny.addRoom(); // Should not add
      expect(compAsAny.editingRooms().length).toBe(5);
    });

    it('should update room name and mark as changed', () => {
      const compAsAny = component as any;
      compAsAny.updateRoomName('room_1', 'New Name');

      expect(compAsAny.editingRooms()[0].name).toBe('New Name');
      expect(compAsAny.hasChanges()).toBe(true);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      const compAsAny = component as any;
      compAsAny.onModalShow();
    });

    it('should validate room names properly', () => {
      const compAsAny = component as any;

      expect(compAsAny.getRoomError('')).toBe('HEATING.ERROR_ROOM_NAME_REQUIRED');
      expect(compAsAny.getRoomError('   ')).toBe('HEATING.ERROR_ROOM_NAME_REQUIRED');

      const longName = 'A'.repeat(126);
      expect(compAsAny.getRoomError(longName)).toBe('HEATING.ERROR_ROOM_NAME_TOO_LONG');

      expect(compAsAny.getRoomError('!@#$')).toBe('HEATING.ERROR_ROOM_NAME_INVALID_CHARS');
      expect(compAsAny.getRoomError('Room 1')).toBeNull();
      expect(compAsAny.getRoomError('A!@#$')).toBeNull(); // Has alphanumeric
    });

    it('should report hasErrors when array is empty or invalid', () => {
      const compAsAny = component as any;

      // Empty array
      compAsAny.editingRooms.set([]);
      expect(compAsAny.hasErrors()).toBe(true);

      // Invalid name
      compAsAny.editingRooms.set([{ id: '1', name: '' }]);
      expect(compAsAny.hasErrors()).toBe(true);

      // Valid name
      compAsAny.editingRooms.set([{ id: '1', name: 'Valid' }]);
      expect(compAsAny.hasErrors()).toBe(false);
    });
  });

  describe('Locking mechanisms', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('roomsWithDataArray', ['1']);
      const compAsAny = component as any;
      compAsAny.onModalShow();
    });

    it('should identify locked rooms that have data', () => {
      const compAsAny = component as any;
      expect(compAsAny.hasData('1')).toBe(true);
      expect(compAsAny.hasData('2')).toBe(false);

      expect(compAsAny.isLocked('1')).toBe(true);
      expect(compAsAny.isLocked('2')).toBe(false); // No data = not locked
    });

    it('should allow requesting, confirming and canceling unlock', () => {
      const compAsAny = component as any;

      compAsAny.requestUnlock('1');
      expect(compAsAny.pendingUnlockRoomId()).toBe('1');

      compAsAny.cancelUnlock();
      expect(compAsAny.pendingUnlockRoomId()).toBeNull();
      expect(compAsAny.isLocked('1')).toBe(true);

      compAsAny.requestUnlock('1');
      compAsAny.confirmUnlock();
      expect(compAsAny.pendingUnlockRoomId()).toBeNull();
      expect(compAsAny.isLocked('1')).toBe(false);

      compAsAny.lockRoom('1');
      expect(compAsAny.isLocked('1')).toBe(true);
    });
  });

  describe('Discard warning and saving', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rooms', [{ id: '1', name: 'Room 1' }]);
      const compAsAny = component as any;
      compAsAny.onModalShow();
    });

    it('should emit cancel immediately if no changes', () => {
      const compAsAny = component as any;
      vi.spyOn(component.cancel, 'emit');

      compAsAny.onCancel();

      expect(compAsAny.showDiscardWarning()).toBe(false);
      expect(component.cancel.emit).toHaveBeenCalled();
    });

    it('should show discard warning if changes exist', () => {
      const compAsAny = component as any;
      vi.spyOn(component.cancel, 'emit');

      compAsAny.hasChanges.set(true);
      compAsAny.onCancel();

      expect(compAsAny.showDiscardWarning()).toBe(true);
      expect(component.cancel.emit).not.toHaveBeenCalled();

      compAsAny.cancelDiscard();
      expect(compAsAny.showDiscardWarning()).toBe(false);
      expect(component.cancel.emit).not.toHaveBeenCalled();

      compAsAny.hasChanges.set(true);
      compAsAny.onCancel();
      compAsAny.confirmDiscard();

      expect(compAsAny.showDiscardWarning()).toBe(false);
      expect(component.cancel.emit).toHaveBeenCalled();
    });

    it('should emit save with trimmed names if no errors', () => {
      const compAsAny = component as any;
      vi.spyOn(component.save, 'emit');

      compAsAny.editingRooms.set([{ id: '1', name: '   Room 1   ' }]);
      compAsAny.onSave();

      expect(component.save.emit).toHaveBeenCalledWith([{ id: '1', name: 'Room 1' }]);
    });

    it('should not emit save if there are errors', () => {
      const compAsAny = component as any;
      vi.spyOn(component.save, 'emit');

      compAsAny.editingRooms.set([{ id: '1', name: '' }]); // Error
      compAsAny.onSave();

      expect(component.save.emit).not.toHaveBeenCalled();
    });
  });

  describe('Import/Export', () => {
    it('should trigger exportRooms from service', () => {
      const compAsAny = component as any;
      compAsAny.exportConfiguration();
      expect(mockRoomsService.exportRooms).toHaveBeenCalled();
    });

    it('should handle file import', async () => {
      const compAsAny = component as any;
      const mockEvent = {
        target: {
          files: [new File([''], 'test.json')],
          value: 'test.json'
        }
      } as any;

      // Simulate successful import
      mockRoomsService.importRooms.mockResolvedValue({ success: true });
      mockRoomsService.rooms.set([{ id: 'imported_1', name: 'Imported Room' }]);

      await compAsAny.importConfiguration(mockEvent);

      expect(mockRoomsService.importRooms).toHaveBeenCalledWith(mockEvent.target.files[0]);
      expect(compAsAny.editingRooms()[0].id).toBe('imported_1');
      expect(compAsAny.hasChanges()).toBe(true);
      expect(mockEvent.target.value).toBe(''); // Reset input
    });

    it('should alert on file import failure', async () => {
      const compAsAny = component as any;
      const mockEvent = {
        target: {
          files: [new File([''], 'bad.json')],
          value: 'bad.json'
        }
      } as any;

      vi.spyOn(window, 'alert').mockImplementation(() => { });

      mockRoomsService.importRooms.mockResolvedValue({ success: false, error: 'Bad file format' });

      await compAsAny.importConfiguration(mockEvent);

      expect(window.alert).toHaveBeenCalledWith('Bad file format');
      expect(compAsAny.hasChanges()).toBe(false);
    });
  });

  describe('Help modal', () => {
    it('should toggle help modal', () => {
      const compAsAny = component as any;
      expect(compAsAny.showHelpModal()).toBe(false);

      compAsAny.showHelp();
      expect(compAsAny.showHelpModal()).toBe(true);

      compAsAny.closeHelp();
      expect(compAsAny.showHelpModal()).toBe(false);
    });
  });
});
