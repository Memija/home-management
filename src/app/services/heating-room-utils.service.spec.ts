import { TestBed } from '@angular/core/testing';
import { HeatingRoomUtilsService } from './heating-room-utils.service';
import { LanguageService } from './language.service';
import { HeatingRoomConfig } from './heating-rooms.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Armchair, Bed, Baby, CookingPot, Bath, Briefcase, DoorOpen, UtensilsCrossed, Home } from 'lucide-angular';
import { signal } from '@angular/core';

describe('HeatingRoomUtilsService', () => {
  let service: HeatingRoomUtilsService;
  let languageServiceMock: { translate: ReturnType<typeof vi.fn>; currentLang: ReturnType<typeof signal<string>> };

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
          'HEATING.ROOM_PATTERNS_HALLWAY': 'hallway,flur'
        };
        return patterns[key] ?? key;
      })
    };

    TestBed.configureTestingModule({
      providers: [
        HeatingRoomUtilsService,
        { provide: LanguageService, useValue: languageServiceMock }
      ]
    });
    service = TestBed.inject(HeatingRoomUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRoomIcon', () => {
    describe('with explicit room type', () => {
      it('should return Armchair icon for living room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_LIVING_ROOM' };
        expect(service.getRoomIcon(room)).toBe(Armchair);
      });

      it('should return Bed icon for bedroom type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_BEDROOM' };
        expect(service.getRoomIcon(room)).toBe(Bed);
      });

      it('should return Baby icon for kids room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_KIDS_ROOM' };
        expect(service.getRoomIcon(room)).toBe(Baby);
      });

      it('should return CookingPot icon for kitchen type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_KITCHEN' };
        expect(service.getRoomIcon(room)).toBe(CookingPot);
      });

      it('should return Bath icon for bathroom type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_BATHROOM' };
        expect(service.getRoomIcon(room)).toBe(Bath);
      });

      it('should return Briefcase icon for office type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_OFFICE' };
        expect(service.getRoomIcon(room)).toBe(Briefcase);
      });

      it('should return DoorOpen icon for guest room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_GUEST_ROOM' };
        expect(service.getRoomIcon(room)).toBe(DoorOpen);
      });

      it('should return UtensilsCrossed icon for dining room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_DINING_ROOM' };
        expect(service.getRoomIcon(room)).toBe(UtensilsCrossed);
      });

      it('should return DoorOpen icon for hallway type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_HALLWAY' };
        expect(service.getRoomIcon(room)).toBe(DoorOpen);
      });

      it('should return Home icon for attic type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any Name', type: 'HEATING.ROOM_ATTIC' };
        expect(service.getRoomIcon(room)).toBe(Home);
      });
    });

    describe('with legacy name patterns (no type)', () => {
      it('should detect living room from English name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Living Room' };
        expect(service.getRoomIcon(room)).toBe(Armchair);
      });

      it('should detect living room from German name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Wohnzimmer' };
        expect(service.getRoomIcon(room)).toBe(Armchair);
      });

      it('should detect bedroom from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Master Bedroom' };
        expect(service.getRoomIcon(room)).toBe(Bed);
      });

      it('should detect bathroom from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Main Bathroom' };
        expect(service.getRoomIcon(room)).toBe(Bath);
      });

      it('should detect kitchen from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Kitchen' };
        expect(service.getRoomIcon(room)).toBe(CookingPot);
      });

      it('should detect kids room from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Kids Room' };
        expect(service.getRoomIcon(room)).toBe(Baby);
      });

      it('should detect office from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Home Office' };
        expect(service.getRoomIcon(room)).toBe(Briefcase);
      });

      it('should detect guest room from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Guest Room' };
        expect(service.getRoomIcon(room)).toBe(DoorOpen);
      });

      it('should detect dining room from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Dining Room' };
        expect(service.getRoomIcon(room)).toBe(UtensilsCrossed);
      });

      it('should detect hallway from name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Hallway' };
        expect(service.getRoomIcon(room)).toBe(DoorOpen);
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
      it('should return Home icon for unknown room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Custom Room', type: 'UNKNOWN_TYPE' };
        // Falls back to name-based detection, which doesn't match -> Home
        expect(service.getRoomIcon(room)).toBe(Home);
      });

      it('should return Home icon for room with no matching pattern', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Basement Storage' };
        expect(service.getRoomIcon(room)).toBe(Home);
      });

      it('should return Home icon for empty name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: '' };
        expect(service.getRoomIcon(room)).toBe(Home);
      });

      it('should return Home icon for room with only spaces in name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: '   ' };
        expect(service.getRoomIcon(room)).toBe(Home);
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
      it('should return pink color for living room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_LIVING_ROOM' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#e91e63');
        expect(color.bg).toBe('rgba(233, 30, 99, 0.1)');
      });

      it('should return purple color for bedroom type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_BEDROOM' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#9c27b0');
      });

      it('should return orange color for kids room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_KIDS_ROOM' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#ff9800');
      });

      it('should return green color for kitchen type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_KITCHEN' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#28a745');
      });

      it('should return cyan color for bathroom type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_BATHROOM' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#00bcd4');
      });

      it('should return indigo color for office type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_OFFICE' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#3f51b5');
      });

      it('should return brown color for guest room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_GUEST_ROOM' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#795548');
      });

      it('should return deep orange color for dining room type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_DINING_ROOM' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#ff5722');
      });

      it('should return blue grey color for hallway type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_HALLWAY' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#607d8b');
      });

      it('should return grey color for attic type', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Any', type: 'HEATING.ROOM_ATTIC' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#9e9e9e');
      });
    });

    describe('with legacy name patterns (no type)', () => {
      it('should detect and return color for living room name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Living Room' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#e91e63');
      });

      it('should detect and return color for German bedroom name', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'Schlafzimmer' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#9c27b0');
      });

      it('should be case insensitive', () => {
        const room: HeatingRoomConfig = { id: 'r1', name: 'BATHROOM' };
        const color = service.getRoomColor(room);
        expect(color.border).toBe('#00bcd4');
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
      expect(service.getRoomIcon(room)).toBe(Home);
    });

    it('should handle empty patterns from translation', () => {
      languageServiceMock.translate.mockImplementation(() => '');

      const room: HeatingRoomConfig = { id: 'r1', name: 'Living Room' };
      // Empty patterns won't match anything
      expect(service.getRoomIcon(room)).toBe(Home);
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
