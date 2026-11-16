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

function toDate(dateValue: Date | string): Date {
  return dateValue instanceof Date ? dateValue : new Date(dateValue);
}

function toTimestamp(dateValue: Date | string): number {
  return toDate(dateValue).getTime();
}

function extractDatesAndYearSpan(recs: ChartDataPoint[]): {
  dates: Date[];
  spansMultipleYears: boolean;
} {
  const dates = recs.map((r) => toDate(r.date));
  const firstYear = dates[0].getFullYear();
  const spansMultipleYears = dates.some((date) => date.getFullYear() !== firstYear);
  return { dates, spansMultipleYears };
}

function resolveDateFormatOptions(
  dataPointCount: number,
  spansMultipleYears: boolean,
): DateFormatOptions {
  if (dataPointCount > 20) {
    return spansMultipleYears ? HIGH_DENSITY_MULTI_YEAR_OPTIONS : HIGH_DENSITY_SINGLE_YEAR_OPTIONS;
  }
  return spansMultipleYears ? LOW_DENSITY_MULTI_YEAR_OPTIONS : LOW_DENSITY_SINGLE_YEAR_OPTIONS;
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
    cached?.lang === lang &&
    cached.length === dataPointCount &&
    cached.firstTime === firstTime &&
    cached.lastTime === lastTime
  ) {
    return cached.labels;
  }

  const { dates, spansMultipleYears } = extractDatesAndYearSpan(recs);
  const formatOptions = resolveDateFormatOptions(dataPointCount, spansMultipleYears);
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
