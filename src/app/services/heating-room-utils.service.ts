import { Injectable, inject } from '@angular/core';
import { Armchair, Bed, Baby, CookingPot, Bath, Briefcase, DoorOpen, UtensilsCrossed, Home, type LucideIconData } from 'lucide-angular';
import { HeatingRoomConfig } from './heating-rooms.service';
import { LanguageService } from './language.service';

/**
 * Room icon mapping by room type key
 */
const ROOM_TYPE_ICONS: Record<string, LucideIconData> = {
    'HEATING.ROOM_LIVING_ROOM': Armchair,
    'HEATING.ROOM_BEDROOM': Bed,
    'HEATING.ROOM_KIDS_ROOM': Baby,
    'HEATING.ROOM_KITCHEN': CookingPot,
    'HEATING.ROOM_BATHROOM': Bath,
    'HEATING.ROOM_OFFICE': Briefcase,
    'HEATING.ROOM_GUEST_ROOM': DoorOpen,
    'HEATING.ROOM_DINING_ROOM': UtensilsCrossed,
    'HEATING.ROOM_HALLWAY': DoorOpen,
    'HEATING.ROOM_ATTIC': Home
};

/**
 * Room colors for chart visualization by room type key
 */
const ROOM_TYPE_COLORS: Record<string, { border: string; bg: string }> = {
    'HEATING.ROOM_LIVING_ROOM': { border: '#e91e63', bg: 'rgba(233, 30, 99, 0.1)' },
    'HEATING.ROOM_BEDROOM': { border: '#9c27b0', bg: 'rgba(156, 39, 176, 0.1)' },
    'HEATING.ROOM_KIDS_ROOM': { border: '#ff9800', bg: 'rgba(255, 152, 0, 0.1)' },
    'HEATING.ROOM_KITCHEN': { border: '#28a745', bg: 'rgba(40, 167, 69, 0.1)' },
    'HEATING.ROOM_BATHROOM': { border: '#00bcd4', bg: 'rgba(0, 188, 212, 0.1)' },
    'HEATING.ROOM_OFFICE': { border: '#3f51b5', bg: 'rgba(63, 81, 181, 0.1)' },
    'HEATING.ROOM_GUEST_ROOM': { border: '#795548', bg: 'rgba(121, 85, 72, 0.1)' },
    'HEATING.ROOM_DINING_ROOM': { border: '#ff5722', bg: 'rgba(255, 87, 34, 0.1)' },
    'HEATING.ROOM_HALLWAY': { border: '#607d8b', bg: 'rgba(96, 125, 139, 0.1)' },
    'HEATING.ROOM_ATTIC': { border: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.1)' }
};

const DEFAULT_ROOM_COLOR = { border: '#ffa726', bg: 'rgba(255, 167, 38, 0.1)' };

/**
 * Service for heating room utilities including icon and color resolution.
 * Provides consistent room visualization across the heating feature.
 */
@Injectable({
    providedIn: 'root'
})
export class HeatingRoomUtilsService {
    private languageService = inject(LanguageService);

    /**
     * Get the icon for a room based on its type or name heuristics.
     */
    getRoomIcon(room: HeatingRoomConfig): LucideIconData {
        if (room.type && ROOM_TYPE_ICONS[room.type]) {
            return ROOM_TYPE_ICONS[room.type];
        }
        return this.guessLegacyIcon(room.name);
    }

    /**
     * Get the color scheme for a room based on its type or name heuristics.
     */
    getRoomColor(room: HeatingRoomConfig): { border: string; bg: string } {
        if (room.type && ROOM_TYPE_COLORS[room.type]) {
            return ROOM_TYPE_COLORS[room.type];
        }
        return this.guessLegacyColor(room.name);
    }

    /**
     * Guess icon based on room name patterns (for legacy data).
     */
    private guessLegacyIcon(name: string): LucideIconData {
        const lower = name.toLowerCase();

        const patternMapping: Array<{ patternKey: string; icon: LucideIconData }> = [
            { patternKey: 'HEATING.ROOM_PATTERNS_LIVING', icon: Armchair },
            { patternKey: 'HEATING.ROOM_PATTERNS_BEDROOM', icon: Bed },
            { patternKey: 'HEATING.ROOM_PATTERNS_BATHROOM', icon: Bath },
            { patternKey: 'HEATING.ROOM_PATTERNS_KITCHEN', icon: CookingPot },
            { patternKey: 'HEATING.ROOM_PATTERNS_KIDS', icon: Baby },
            { patternKey: 'HEATING.ROOM_PATTERNS_OFFICE', icon: Briefcase },
            { patternKey: 'HEATING.ROOM_PATTERNS_GUEST', icon: DoorOpen },
            { patternKey: 'HEATING.ROOM_PATTERNS_DINING', icon: UtensilsCrossed },
            { patternKey: 'HEATING.ROOM_PATTERNS_HALLWAY', icon: DoorOpen }
        ];

        for (const { patternKey, icon } of patternMapping) {
            const patternsString = this.languageService.translate(patternKey);
            const patterns = patternsString.split(',').map(p => p.trim().toLowerCase());
            if (patterns.some(pattern => pattern && lower.includes(pattern))) {
                return icon;
            }
        }

        return Home;
    }

    /**
     * Guess color based on room name patterns (for legacy data).
     */
    private guessLegacyColor(name: string): { border: string; bg: string } {
        const lower = name.toLowerCase();

        const patternMapping: Array<{ patternKey: string; roomType: string }> = [
            { patternKey: 'HEATING.ROOM_PATTERNS_LIVING', roomType: 'HEATING.ROOM_LIVING_ROOM' },
            { patternKey: 'HEATING.ROOM_PATTERNS_BEDROOM', roomType: 'HEATING.ROOM_BEDROOM' },
            { patternKey: 'HEATING.ROOM_PATTERNS_BATHROOM', roomType: 'HEATING.ROOM_BATHROOM' },
            { patternKey: 'HEATING.ROOM_PATTERNS_KITCHEN', roomType: 'HEATING.ROOM_KITCHEN' },
            { patternKey: 'HEATING.ROOM_PATTERNS_KIDS', roomType: 'HEATING.ROOM_KIDS_ROOM' },
            { patternKey: 'HEATING.ROOM_PATTERNS_OFFICE', roomType: 'HEATING.ROOM_OFFICE' },
            { patternKey: 'HEATING.ROOM_PATTERNS_GUEST', roomType: 'HEATING.ROOM_GUEST_ROOM' },
            { patternKey: 'HEATING.ROOM_PATTERNS_DINING', roomType: 'HEATING.ROOM_DINING_ROOM' },
            { patternKey: 'HEATING.ROOM_PATTERNS_HALLWAY', roomType: 'HEATING.ROOM_HALLWAY' }
        ];

        for (const { patternKey, roomType } of patternMapping) {
            const patternsString = this.languageService.translate(patternKey);
            const patterns = patternsString.split(',').map(p => p.trim().toLowerCase());
            if (patterns.some(pattern => pattern && lower.includes(pattern))) {
                return ROOM_TYPE_COLORS[roomType] ?? DEFAULT_ROOM_COLOR;
            }
        }

        return DEFAULT_ROOM_COLOR;
    }
}
