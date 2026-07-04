import { describe, it, expect, vi } from 'vitest';
import { generateSmartLabels } from './chart-labels.utils';
import { ConsumptionRecord } from '../../models/records.model';
import { LanguageService } from '../../services/language.service';

const makeRecs = (dates: string[]): ConsumptionRecord[] =>
  dates.map((d) => ({
    date: new Date(d),
    kitchenWarm: 10,
    kitchenCold: 20,
    bathroomWarm: 5,
    bathroomCold: 15,
  }));

const makeLangService = (multiYear = false): LanguageService => ({
  formatDate: vi.fn().mockImplementation((_date: Date, options: Intl.DateTimeFormatOptions) => {
    if (options.year) return multiYear ? "Jan '24" : 'Jan 1, 2024';
    if (options.day) return 'Jan 1';
    return 'Jan';
  }),
} as unknown as LanguageService);

describe('generateSmartLabels', () => {
  describe('empty input', () => {
    it('should return an empty array for empty input', () => {
      expect(generateSmartLabels([], makeLangService())).toEqual([]);
    });
  });

  describe('low density (≤ 20 data points)', () => {
    it('should return one label per record', () => {
      const recs = makeRecs(['2024-01-15', '2024-02-15', '2024-03-15']);
      const svc = makeLangService();
      const labels = generateSmartLabels(recs, svc);
      expect(labels).toHaveLength(3);
    });

    it('should call formatDate with month + day for same-year data', () => {
      const recs = makeRecs(['2024-01-15', '2024-02-15']);
      const svc = makeLangService();
      generateSmartLabels(recs, svc);
      expect(svc.formatDate).toHaveBeenCalledWith(expect.any(Date), { month: 'short', day: 'numeric' });
    });

    it('should call formatDate with month + day + year for multi-year data', () => {
      const recs = makeRecs(['2023-12-15', '2024-01-15']);
      const svc = makeLangService(true);
      generateSmartLabels(recs, svc);
      expect(svc.formatDate).toHaveBeenCalledWith(
        expect.any(Date),
        { month: 'short', day: 'numeric', year: 'numeric' },
      );
    });
  });

  describe('high density (> 20 data points)', () => {
    const makeManyRecs = () =>
      makeRecs(
        Array.from({ length: 25 }, (_, i) => {
          const month = String((i % 12) + 1).padStart(2, '0');
          return `2024-${month}-15`;
        }),
      );

    it('should return one label per record', () => {
      const recs = makeManyRecs();
      const labels = generateSmartLabels(recs, makeLangService());
      expect(labels).toHaveLength(25);
    });

    it('should call formatDate with month only for same-year high-density data', () => {
      const recs = makeManyRecs();
      const svc = makeLangService();
      generateSmartLabels(recs, svc);
      expect(svc.formatDate).toHaveBeenCalledWith(expect.any(Date), { month: 'short' });
    });

    it('should call formatDate with month + year for multi-year high-density data', () => {
      const dates = [
        ...Array.from({ length: 13 }, (_, i) => {
          const month = String((i % 12) + 1).padStart(2, '0');
          return `2023-${month}-15`;
        }),
        ...Array.from({ length: 12 }, (_, i) => {
          const month = String((i % 12) + 1).padStart(2, '0');
          return `2024-${month}-15`;
        }),
      ];
      const recs = makeRecs(dates);
      const svc = makeLangService(true);
      generateSmartLabels(recs, svc);
      expect(svc.formatDate).toHaveBeenCalledWith(
        expect.any(Date),
        { month: 'short', year: 'numeric' },
      );
    });
  });

  describe('single record', () => {
    it('should return a single label for a single record', () => {
      const recs = makeRecs(['2024-06-15']);
      const labels = generateSmartLabels(recs, makeLangService());
      expect(labels).toHaveLength(1);
    });
  });

  describe('boundary — exactly 20 data points', () => {
    it('should use day format (not month-only) for exactly 20 records', () => {
      const recs = makeRecs(
        Array.from({ length: 20 }, (_, i) => {
          const month = String((i % 12) + 1).padStart(2, '0');
          return `2024-${month}-15`;
        }),
      );
      const svc = makeLangService();
      generateSmartLabels(recs, svc);
      expect(svc.formatDate).toHaveBeenCalledWith(expect.any(Date), { month: 'short', day: 'numeric' });
    });

    it('should switch to month-only at 21 records', () => {
      const recs = makeRecs(
        Array.from({ length: 21 }, (_, i) => {
          const month = String((i % 12) + 1).padStart(2, '0');
          return `2024-${month}-15`;
        }),
      );
      const svc = makeLangService();
      generateSmartLabels(recs, svc);
      expect(svc.formatDate).toHaveBeenCalledWith(expect.any(Date), { month: 'short' });
    });
  });
});
