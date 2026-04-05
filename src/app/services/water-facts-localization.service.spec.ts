import { TestBed } from '@angular/core/testing';
import { WaterFactsService } from './water-facts.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WaterFactsService (Multi-language Localization)', () => {
  let service: WaterFactsService;
  let mockLanguageService: any;

  beforeEach(() => {
    mockLanguageService = {
      currentLang: vi.fn(),
      currentLocale: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WaterFactsService,
        { provide: LanguageService, useValue: mockLanguageService }
      ],
    });
    service = TestBed.inject(WaterFactsService);
  });

  describe('German (de)', () => {
    beforeEach(() => {
      mockLanguageService.currentLang.mockReturnValue('de');
      mockLanguageService.currentLocale.mockReturnValue('de-DE');
    });

    it('should handle large numbers (Millionen)', () => {
      const result = service.getFactByIndex(1000000, 19, 'total');
      expect(result?.message).toContain('über');
      expect(result?.message).toContain('Millionen');
    });

    it('should convert days to years (Jahr)', () => {
      // 20000 / 50 = 400 days -> 1 Jahr
      const result = service.getFactByIndex(20000, 11, 'total');
      expect(result?.message).toContain('1 Jahr');
    });

    it('should convert days to years (Jahre)', () => {
      // Divisor index 11 is 30 (TOILET_PER_DAY). 
      // 40000 / 30 = 1333 days -> 3 Jahre
      const result = service.getFactByIndex(40000, 11, 'total');
      expect(result?.message).toContain('3 Jahre');
    });
  });

  describe('Serbian (sr)', () => {
    beforeEach(() => {
      mockLanguageService.currentLang.mockReturnValue('sr');
      mockLanguageService.currentLocale.mockReturnValue('sr-Cyrl-RS');
    });

    it('should handle large numbers in Cyrillic (милиона)', () => {
      const result = service.getFactByIndex(2000000, 19, 'total');
      expect(result?.message).toContain('преко');
      expect(result?.message).toContain('милиона');
    });

    it('should handle large numbers in Cyrillic (хиљада)', () => {
      const result = service.getFactByIndex(100000, 19, 'total');
      expect(result?.message).toContain('хиљада');
    });

    it('should handle time conversion to years in Cyrillic (годину)', () => {
      const result = service.getFactByIndex(20000, 11, 'total');
      expect(result?.message).toContain('годину');
    });

    it('should handle time conversion to hours in Cyrillic (сати)', () => {
      // 1200 / 10 = 120 min = 2 hours
      const result = service.getFactByIndex(1200, 6, 'total');
      expect(result?.message).toContain('сати');
    });
  });

  describe('Polish (pl)', () => {
    beforeEach(() => {
      mockLanguageService.currentLang.mockReturnValue('pl');
      mockLanguageService.currentLocale.mockReturnValue('pl-PL');
    });

    it('should handle large numbers (miliony)', () => {
      const result = service.getFactByIndex(2000000, 19, 'total');
      expect(result?.message).toContain('ponad');
      expect(result?.message).toContain('2 miliony');
    });

    it('should handle large numbers (milionów)', () => {
      const result = service.getFactByIndex(5000000, 19, 'total');
      expect(result?.message).toContain('5 milionów');
    });

    it('should convert days to years (rok)', () => {
      const result = service.getFactByIndex(20000, 11, 'total');
      expect(result?.message).toContain('1 rok');
    });

    it('should convert days to years (lata)', () => {
      // 40000 / 30 = 1333 days -> 3 lata
      const result = service.getFactByIndex(40000, 11, 'total');
      expect(result?.message).toContain('3 lata');
    });

    it('should convert minutes to hours (godziny)', () => {
      const result = service.getFactByIndex(1200, 6, 'total');
      expect(result?.message).toContain('2 godziny');
    });
  });

  describe('Indonesian (id)', () => {
    beforeEach(() => {
      mockLanguageService.currentLang.mockReturnValue('id');
      mockLanguageService.currentLocale.mockReturnValue('id-ID');
    });

    it('should handle large numbers (juta)', () => {
      const result = service.getFactByIndex(2000000, 19, 'total');
      expect(result?.message).toContain('lebih dari');
      expect(result?.message).toContain('juta');
    });

    it('should convert days to years (tahun)', () => {
      // Use index 8: 'Ini bisa menghidrasi Anda selama {value} hari!'
      // Divisor index 8 is 2 (DRINKING_PER_DAY).
      // 2000 / 2 = 1000 days -> 2 tahun
      const result = service.getFactByIndex(2000, 8, 'total');
      expect(result?.message).toContain('2 tahun');
    });

    it('should convert minutes to hours (jam)', () => {
      // Use index 6: 'Anda bisa mandi shower selama {value} menit tanpa henti!'
      // Divisor index 6 is 10 (SHOWER_MINUTES).
      // 1200 / 10 = 120 min = 2 jam
      const result = service.getFactByIndex(1200, 6, 'total');
      expect(result?.message).toContain('2 jam');
    });
  });

  describe('Bosnian (bs) - Regression Check', () => {
    beforeEach(() => {
      mockLanguageService.currentLang.mockReturnValue('bs');
      mockLanguageService.currentLocale.mockReturnValue('bs-Latn-BA');
    });

    it('should still handle large numbers (milion)', () => {
      const result = service.getFactByIndex(1000000, 19, 'total');
      expect(result?.message).toContain('milion');
    });

    it('should still handle hours (sat)', () => {
      const result = service.getFactByIndex(610, 6, 'total');
      expect(result?.message).toContain('sat');
    });
  });
});
