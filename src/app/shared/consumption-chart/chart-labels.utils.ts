import { LanguageService } from '../../services/language.service';
import { ChartDataPoint } from './consumption-chart.models';

/**
 * Generates smart x-axis labels that adapt their format based on data density and locale.
 *
 * - High density (> 20 points): shows month name only (Chart.js auto-skips duplicates).
 * - Low / medium density (≤ 20 points): shows month + day.
 * - Multi-year datasets always include the year component.
 */
export function generateSmartLabels(
  recs: ChartDataPoint[],
  languageService: LanguageService,
): string[] {
  if (recs.length === 0) return [];

  const dates = recs.map((r) => new Date(r.date));
  const years = new Set(dates.map((d) => d.getFullYear()));
  const spansMultipleYears = years.size > 1;
  const dataPointCount = recs.length;

  return dates.map((date) => {
    if (dataPointCount > 20) {
      // High density: show just month name
      if (spansMultipleYears) {
        return languageService.formatDate(date, { month: 'short', year: 'numeric' });
      }
      return languageService.formatDate(date, { month: 'short' });
    } else {
      // Low / medium density: show month and day
      if (spansMultipleYears) {
        return languageService.formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return languageService.formatDate(date, { month: 'short', day: 'numeric' });
    }
  });
}
