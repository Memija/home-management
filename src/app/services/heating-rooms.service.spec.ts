import { TestBed } from '@angular/core/testing';
import { HeatingRoomsService } from './heating-rooms.service';
import { LocalStorageService } from './local-storage.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { signal } from '@angular/core';

describe('HeatingRoomsService', () => {
  let service: HeatingRoomsService;
  let mockLocalStorageService: any;
  let mockLanguageService: any;

  beforeEach(() => {
    mockLocalStorageService = {
      getPreference: vi.fn().mockReturnValue(null),
      setPreference: vi.fn(),
    };

    mockLanguageService = {
      translate: vi.fn().mockImplementation((key) => key),
      currentLang: signal('en')
    };

    TestBed.configureTestingModule({
      providers: [
        HeatingRoomsService,
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: LanguageService, useValue: mockLanguageService }
      ]
    });
    service = TestBed.inject(HeatingRoomsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load rooms from storage', () => {
      const storedRooms = [{ id: 'room_1', name: 'Living Room' }];
      mockLocalStorageService.getPreference.mockReturnValue(JSON.stringify(storedRooms));

      // Re-create service to trigger load
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          HeatingRoomsService,
          { provide: LocalStorageService, useValue: mockLocalStorageService },
          { provide: LanguageService, useValue: mockLanguageService }
        ]
      });
      const newService = TestBed.inject(HeatingRoomsService);

      expect(newService.rooms().length).toBe(1);
      expect(newService.rooms()[0].name).toBe('Living Room');
    });

    it('should start empty if no storage', () => {
      expect(service.rooms().length).toBe(0);
    });
  });

  describe('Room Management', () => {
    it('should add a room', () => {
      service.addRoom();
      expect(service.rooms().length).toBe(1);
      expect(service.rooms()[0].id).toBe('room_1');
      expect(mockLocalStorageService.setPreference).toHaveBeenCalled();
    });

    it('should remove a room', () => {
      service.addRoom(); // room_1
      service.addRoom(); // room_2
      service.removeRoom('room_1');

      expect(service.rooms().length).toBe(1);
      expect(service.rooms()[0].id).toBe('room_2');
    });

    it('should update room name', () => {
      service.addRoom();
      service.updateRoomName('room_1', 'New Name');
      expect(service.rooms()[0].name).toBe('New Name');
    });

    it('should reset rooms', () => {
      service.addRoom();
      service.reset();
      expect(service.rooms().length).toBe(0);
    });

    it('should set rooms', () => {
      const rooms = [{ id: 'custom', name: 'Custom' }];
      service.setRooms(rooms);
      expect(service.rooms().length).toBe(1);
      expect(service.rooms()[0].id).toBe('custom');
    });

    it('should limit max rooms', () => {
      // Add 10 rooms
      for (let i = 0; i < 10; i++) {
        service.addRoom();
      }
      expect(service.rooms().length).toBe(10);
      expect(service.canAddRoom()).toBe(false);

      service.addRoom(); // Try 11th
      expect(service.rooms().length).toBe(10);
    });
  });

  describe('Predefined names', () => {
    it('should use predefined names for first few rooms', () => {
      service.addRoom();
      expect(mockLanguageService.translate).toHaveBeenCalledWith('HEATING.ROOM_LIVING_ROOM');

      service.addRoom();
      expect(mockLanguageService.translate).toHaveBeenCalledWith('HEATING.ROOM_BEDROOM');
    });

  });

  describe('Export/Import', () => {
    it('should export rooms to JSON file', () => {
      // Setup mock DOM methods
      const mockCreateElement = vi.spyOn(document, 'createElement');
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);
      const mockClick = vi.fn();
      const mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { });
      const mockCreateObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

      mockCreateElement.mockReturnValue({
        href: '',
        download: '',
        click: mockClick
      } as unknown as HTMLAnchorElement);

      service.addRoom();
      service.exportRooms();

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test');

      // Cleanup
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      mockRevokeObjectURL.mockRestore();
      mockCreateObjectURL.mockRestore();
    });

    it('should import valid room configuration', async () => {
      const validData = [
        { id: 'room_1', name: 'Kitchen' },
        { id: 'room_2', name: 'Bedroom' }
      ];
      // Create mock file with text() method
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(validData))
      } as unknown as File;

      const result = await service.importRooms(mockFile);

      expect(result.success).toBe(true);
      expect(service.rooms().length).toBe(2);
      expect(service.rooms()[0].name).toBe('Kitchen');
    });

    it('should reject non-array data', async () => {
      const invalidData = { id: 'room_1', name: 'Test' };
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(invalidData))
      } as unknown as File;

      const result = await service.importRooms(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expected an array');
    });

    it('should reject room without id', async () => {
      const invalidData = [{ name: 'Test Room' }];
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(invalidData))
      } as unknown as File;

      const result = await service.importRooms(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing or invalid 'id'");
    });

    it('should reject room without name', async () => {
      const invalidData = [{ id: 'room_1' }];
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(invalidData))
      } as unknown as File;

      const result = await service.importRooms(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing or invalid 'name'");
    });

    it('should handle invalid JSON', async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue('not valid json')
      } as unknown as File;

      const result = await service.importRooms(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
