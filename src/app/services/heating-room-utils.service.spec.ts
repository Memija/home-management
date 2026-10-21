import { TestBed } from '@angular/core/testing';
import { HeatingRoomUtilsService } from './heating-room-utils.service';
import { LanguageService } from './language.service';
import { HeatingRoomConfig } from './heating-rooms.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Armchair,
  Bed,
  Baby,
  CookingPot,
  Bath,
  Briefcase,
  DoorOpen,
  UtensilsCrossed,
  House,
} from 'lucide-angular';
import { signal } from '@angular/core';

describe('HeatingRoomUtilsService', () => {
  let service: HeatingRoomUtilsService;
  let languageServiceMock: {
    translate: ReturnType<typeof vi.fn>;
    currentLang: ReturnType<typeof signal<string>>;
  };

  beforeEach(() => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => {
        // Mock translations for room patterns
        const patterns: Record<string, string> = {
          'HEATING.ROOM_PATTERNS_LIVING': 'living,wohnzimmer',
          'HEATING.ROOM_PATTERNS_BEDROOM': 'bedroom,schlafzimmer',
          'HEATING.ROOM_PATTERNS_BATHROOM': 'bathroom,badezimmer,bad',
          'HEATING.ROOM_PATTERNS_KITCHEN': 'kitchen,küche',
          'HEATING.ROOM_PATTERNS_KIDS': 'kids,kinderzimmer',
          'HEATING.ROOM_PATTERNS_OFFICE': 'office,büro,arbeitszimmer',
          'HEATING.ROOM_PATTERNS_GUEST': 'guest,gästezimmer',
          'HEATING.ROOM_PATTERNS_DINING': 'dining,esszimmer',
          'HEATING.ROOM_PATTERNS_HALLWAY': 'hallway,flur',
        };
        return patterns[key] ?? key;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        HeatingRoomUtilsService,
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    });
    service = TestBed.inject(HeatingRoomUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRoomIcon', () => {
    describe('with explicit room type', () => {
      it('should return Armchair icon for living room type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_LIVING_ROOM',
        };
        expect(service.getRoomIcon(room)).toBe(Armchair);
      });

      it('should return Bed icon for bedroom type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_BEDROOM',
        };
        expect(service.getRoomIcon(room)).toBe(Bed);
      });

      it('should return Baby icon for kids room type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_KIDS_ROOM',
        };
        expect(service.getRoomIcon(room)).toBe(Baby);
      });

      it('should return CookingPot icon for kitchen type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_KITCHEN',
        };
        expect(service.getRoomIcon(room)).toBe(CookingPot);
      });

      it('should return Bath icon for bathroom type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_BATHROOM',
        };
        expect(service.getRoomIcon(room)).toBe(Bath);
      });

      it('should return Briefcase icon for office type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_OFFICE' };
        expect(service.getRoomIcon(room)).toBe(Briefcase);
      });

      it('should return DoorOpen icon for guest room type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_GUEST_ROOM',
        };
        expect(service.getRoomIcon(room)).toBe(DoorOpen);
      });

      it('should return UtensilsCrossed icon for dining room type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_DINING_ROOM',
        };
        expect(service.getRoomIcon(room)).toBe(UtensilsCrossed);
      });

      it('should return DoorOpen icon for hallway type', () => {
        const room: HeatingRoomConfig = {
          id: 'r1',
          name: 'Any Name',
          type: 'HEATING.ROOM_HALLWAY',
        };
        expect(service.getRoomIcon(room)).toBe(DoorOpen);
      });

      it('should return House icon for attic type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_ATTIC' };
        expect(service.getRoomIcon(room)).toBe(House);
      });
    });

    describe('with legacy name patterns (no type)', () => {
      it.each([
        { name: 'Living Room', expected: Armchair },
        { name: 'Wohnzimmer', expected: Armchair },
        { name: 'Master Bedroom', expected: Bed },
        { name: 'Main Bathroom', expected: Bath },
        { name: 'Kitchen', expected: CookingPot },
        { name: 'Kids Room', expected: Baby },
        { name: 'Home Office', expected: Briefcase },
        { name: 'Guest Room', expected: DoorOpen },
        { name: 'Dining Room', expected: UtensilsCrossed },
        { name: 'Hallway', expected: DoorOpen },
      ])('should detect icon for $name', ({ name, expected }) => {
        const room: HeatingRoomConfig = { id: 'r1', name };
        expect(service.getRoomIcon(room)).toBe(expected);
      });

      it('should be case insensitive for name matching', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'LIVING ROOM' };
        expect(service.getRoomIcon(room)).toBe(Armchair);
      });

      it('should match partial patterns in longer names', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Cozy Living Room Area' };
        expect(service.getRoomIcon(room)).toBe(Armchair);
      });
    });

    describe('edge cases', () => {
      it('should return House icon for unknown room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Custom Room', type: 'UNKNOWN_TYPE' };
        // Falls back to name-based detection, which doesn't match -> House
        expect(service.getRoomIcon(room)).toBe(House);
      });

      it.each([
        { name: 'Basement Storage', desc: 'room with no matching pattern' },
        { name: '', desc: 'empty name' },
        { name: '   ', desc: 'room with only spaces in name' },
      ])('should return House icon for $desc', ({ name }) => {
        const room: HeatingRoomConfig = { id: 'r1', name };
        expect(service.getRoomIcon(room)).toBe(House);
      });

      it('should prioritize type over name', () => {
        // Name says "bedroom" but type says "kitchen"
        const room: HeatingRoomConfig = { id: 'r1', name: 'bedroom', type: 'HEATING.ROOM_KITCHEN' };
        expect(service.getRoomIcon(room)).toBe(CookingPot);
      });

      it('should handle undefined type gracefully', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Bedroom', type: undefined };
        expect(service.getRoomIcon(room)).toBe(Bed);
      });

      it('should handle empty string type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Kitchen', type: '' };
        expect(service.getRoomIcon(room)).toBe(CookingPot);
      });
    });
  });

  describe('getRoomColor', () => {
    describe('with explicit room type', () => {
      it.each([
        {
          type: 'HEATING.ROOM_LIVING_ROOM',
          border: '#e91e63',
          bg: 'rgba(233, 30, 99, 0.1)',
          desc: 'living room',
        },
        {
          type: 'HEATING.ROOM_BEDROOM',
          border: '#9c27b0',
          bg: 'rgba(156, 39, 176, 0.1)',
          desc: 'bedroom',
        },
        {
          type: 'HEATING.ROOM_KIDS_ROOM',
          border: '#ff9800',
          bg: 'rgba(255, 152, 0, 0.1)',
          desc: 'kids room',
        },
        {
          type: 'HEATING.ROOM_KITCHEN',
          border: '#28a745',
          bg: 'rgba(40, 167, 69, 0.1)',
          desc: 'kitchen',
        },
        {
          type: 'HEATING.ROOM_BATHROOM',
          border: '#00bcd4',
          bg: 'rgba(0, 188, 212, 0.1)',
          desc: 'bathroom',
        },
        {
          type: 'HEATING.ROOM_OFFICE',
          border: '#3f51b5',
          bg: 'rgba(63, 81, 181, 0.1)',
          desc: 'office',
        },
        {
          type: 'HEATING.ROOM_GUEST_ROOM',
          border: '#795548',
          bg: 'rgba(121, 85, 72, 0.1)',
          desc: 'guest room',
        },
        {
          type: 'HEATING.ROOM_DINING_ROOM',
          border: '#ff5722',
          bg: 'rgba(255, 87, 34, 0.1)',
          desc: 'dining room',
        },
        {
          type: 'HEATING.ROOM_HALLWAY',
          border: '#607d8b',
          bg: 'rgba(96, 125, 139, 0.1)',
          desc: 'hallway',
        },
        {
          type: 'HEATING.ROOM_ATTIC',
          border: '#9e9e9e',
          bg: 'rgba(158, 158, 158, 0.1)',
          desc: 'attic',
        },
      ])('should return color for $desc type', ({ type, border, bg }) => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type };
        const color = service.getRoomColor(room);
        expect(color.border).toBe(border);
        if (bg) {
          expect(color.bg).toBe(bg);
        }
      });
    });

    describe('with legacy name patterns (no type)', () => {
      it.each([
        { name: 'Living Room', expectedBorder: '#e91e63', desc: 'living room name' },
        { name: 'Schlafzimmer', expectedBorder: '#9c27b0', desc: 'German bedroom name' },
        { name: 'BATHROOM', expectedBorder: '#00bcd4', desc: 'case insensitive bathroom name' },
      ])('should detect and return color for $desc', ({ name, expectedBorder }) => {
        const room: HeatingRoomConfig = { id: 'r1', name };
        const color = service.getRoomColor(room);
        expect(color.border).toBe(expectedBorder);
      });
    });

    describe('edge cases', () => {
      it('should return default color for unknown room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Unknown', type: 'UNKNOWN_TYPE' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#ffa726');
        expect(color.bg).toBe('rgba(255, 167, 38, 0.1)');
      });

      it('should return default color for room with no matching pattern', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Garage' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#ffa726');
      });

      it('should return default color for empty name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: '' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#ffa726');
      });

      it('should prioritize type over name for color', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'bedroom', type: 'HEATING.ROOM_KITCHEN' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#28a745'); // Kitchen color, not bedroom
      });

      it('should handle undefined type gracefully', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Office Space', type: undefined };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#3f51b5');
      });

      it('should handle empty string type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Dining area', type: '' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#ff5722');
      });

      it('should return consistent color structure', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Test' };
        const color = service.getRoomColor(room);
        expect(color).toHaveProperty('border');
        expect(color).toHaveProperty('bg');
        expect(typeof color.border).toBe('string');
        expect(typeof color.bg).toBe('string');
      });
    });
  });

  describe('pattern matching behavior', () => {
    it('should match first pattern in order when multiple could match', () => {
      // "living bedroom" contains both living and bedroom patterns
      // Should match living first since it's checked first
      const room: HeatingRoomConfig = { id: 'r1', name: 'living bedroom' };
      expect(service.getRoomIcon(room)).toBe(Armchair); // Living room icon
    });

    it('should handle translation service returning key as-is', () => {
      // Simulate untranslated pattern key
      languageServiceMock.translate.mockImplementation((key: string) => key);

      const room: HeatingRoomConfig = { id: 'r1', name: 'Living Room' };
      // Pattern won't match because translation returns the key itself
      expect(service.getRoomIcon(room)).toBe(House);
    });

    it('should handle empty patterns from translation', () => {
      languageServiceMock.translate.mockImplementation(() => '');

      const room: HeatingRoomConfig = { id: 'r1', name: 'Living Room' };
      // Empty patterns won't match anything
      expect(service.getRoomIcon(room)).toBe(House);
    });

    it('should handle patterns with extra whitespace', () => {
      languageServiceMock.translate.mockImplementation((key: string) => {
        if (key === 'HEATING.ROOM_PATTERNS_LIVING') {
          return '  living  ,  wohnzimmer  ';
        }
        return key;
      });

      const room: HeatingRoomConfig = { id: 'r1', name: 'Living Room' };
      expect(service.getRoomIcon(room)).toBe(Armchair);
    });
  });
});
