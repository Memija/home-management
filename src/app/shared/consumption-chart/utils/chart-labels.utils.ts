import { LanguageService } from '../../../services/language.service';
import { ChartDataPoint } from '../../../models/consumption-chart.model';

type DateFormatOptions = NonNullable<Parameters<LanguageService['formatDate']>[1]>;

const HIGH_DENSITY_MULTI_YEAR_OPTIONS: DateFormatOptions = {
  month: 'short',
  year: 'numeric',
};
const HIGH_DENSITY_SINGLE_YEAR_OPTIONS: DateFormatOptions = {
  month: 'short',
};
const LOW_DENSITY_MULTI_YEAR_OPTIONS: DateFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};
const LOW_DENSITY_SINGLE_YEAR_OPTIONS: DateFormatOptions = {
  month: 'short',
  day: 'numeric',
};

const smartLabelsCache = new WeakMap<
  ChartDataPoint[],
  {
    lang: string;
    length: number;
    firstTime: number;
    lastTime: number;
    labels: string[];
  }
>();

function toTimestamp(dateValue: Date | string): number {
  return dateValue instanceof Date ? dateValue.getTime() : new Date(dateValue).getTime();
}

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
  const dataPointCount = recs.length;
  if (dataPointCount === 0) return [];

  const lang = languageService.currentLang?.() ?? '';
  const firstTime = toTimestamp(recs[0].date);
  const lastTime = toTimestamp(recs[dataPointCount - 1].date);
  const cached = smartLabelsCache.get(recs);
  if (
    cached &&
    cached.lang === lang &&
    cached.length === dataPointCount &&
    cached.firstTime === firstTime &&
    cached.lastTime === lastTime
  ) {
    return cached.labels;
  }

  const dates: Date[] = [];
  let firstYear: number | null = null;
  let spansMultipleYears = false;

  for (const r of recs) {
    const date = r.date instanceof Date ? r.date : new Date(r.date);
    dates.push(date);
    if (!spansMultipleYears) {
      const year = date.getFullYear();
      if (firstYear === null) {
        firstYear = year;
      } else if (year !== firstYear) {
        spansMultipleYears = true;
      }
    }
  }

  let formatOptions: DateFormatOptions;
  if (dataPointCount > 20) {
    formatOptions = spansMultipleYears
      ? HIGH_DENSITY_MULTI_YEAR_OPTIONS
      : HIGH_DENSITY_SINGLE_YEAR_OPTIONS;
  } else {
    formatOptions = spansMultipleYears
      ? LOW_DENSITY_MULTI_YEAR_OPTIONS
      : LOW_DENSITY_SINGLE_YEAR_OPTIONS;
  }

  const labels = dates.map((date) => languageService.formatDate(date, formatOptions));
  smartLabelsCache.set(recs, {
    lang,
    length: dataPointCount,
    firstTime,
    lastTime,
    labels,
  });
  return labels;
}
