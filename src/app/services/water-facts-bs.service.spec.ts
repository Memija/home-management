import { TestBed } from '@angular/core/testing';
import { WaterFactsService } from './water-facts.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WaterFactsService (Bosnian Localization)', () => {
  let service: WaterFactsService;
  let mockLanguageService: any;

  beforeEach(() => {
    mockLanguageService = {
      currentLang: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WaterFactsService,
        { provide: LanguageService, useValue: mockLanguageService }
      ],
    });
    service = TestBed.inject(WaterFactsService);
  });

  it('should handle large numbers in Bosnian (milion)', () => {
    mockLanguageService.currentLang.mockReturnValue('bs');

    // Index 19: 'Ovo teži oko {value} kg! ⚖️'
    // Divisor at index 19 is 1
    const result = service.getFactByIndex(1000000, 19, 'total');
    expect(result?.message).toContain('milion');
    expect(result?.message).toContain('preko');
  });

  it('should handle large numbers in Bosnian (miliona)', () => {
    mockLanguageService.currentLang.mockReturnValue('bs');
    const result = service.getFactByIndex(2000000, 19, 'total');
    expect(result?.message).toContain('miliona');
  });

  it('should handle large numbers in Bosnian (hiljada)', () => {
    mockLanguageService.currentLang.mockReturnValue('bs');
    const result = service.getFactByIndex(100000, 19, 'total');
    expect(result?.message).toContain('hiljada');
  });

  it('should handle time conversion to years in Bosnian (godinu)', () => {
    mockLanguageService.currentLang.mockReturnValue('bs');
    // Index 11: 'To je {value} dana korištenja toaleta za jednu osobu! 📅'
    // Actually day conversion happens if the template contains 'dana'
    // Divisor at index 11 is WATER_EQUIVALENTS.TOILET_PER_DAY (approx 35-50)
    // Let's use 400 * 50 = 20000 liters.
    // 20000 / 50 = 400 days -> 1 year
    const result = service.getFactByIndex(20000, 11, 'total');
    expect(result?.message).toContain('godinu');
  });

  it('should handle time conversion to years in Bosnian (plural)', () => {
    mockLanguageService.currentLang.mockReturnValue('bs');
    // 800 days -> 2 years -> '2 godina'
    const result = service.getFactByIndex(40000, 11, 'total');
    expect(result?.message).toContain('godina');
  });

  it('should handle time conversion to hours in Bosnian (sati)', () => {
    mockLanguageService.currentLang.mockReturnValue('bs');
    // Index 9: 'To je {value} osvježavajućih jutarnjih tuširanja! 🌅'
    // Wait, regex is for 'minuta/minutu'.
    // Index 6: 'Mogli biste se tuširati {value} minuta bez prestanka! ⏱️'
    // Divisor at index 6 is WATER_EQUIVALENTS.SHOWER_MINUTES (10)
    // 1200 liters -> 120 minutes -> 2 hours -> '2 sati'
    const result = service.getFactByIndex(1200, 6, 'total');
    expect(result?.message).toContain('sati');
  });

  it('should handle time conversion to hours in Bosnian (sat)', () => {
    mockLanguageService.currentLang.mockReturnValue('bs');
    // 610 liters -> 61 minutes -> 1 hour -> '1 sat'
    const result = service.getFactByIndex(610, 6, 'total');
    expect(result?.message).toContain('sat');
  });
});
