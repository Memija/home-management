import { BenchmarkSourceLink } from '../models/benchmark-sources.data';

export type BenchmarkSortColumn = 'country' | 'water' | 'electricity' | 'heating';
export type BenchmarkSortDirection = 'asc' | 'desc';
export type HouseholdSizeParams = Readonly<Record<number, { readonly count: number }>>;

export interface CountryBenchmarkRow {
  readonly code: string;
  readonly name: string;
  readonly flagUrl: string;
  readonly waterDailyLiters: number;
  readonly electricityYearlyKwh: number;
  readonly heatingYearlyKwh: number;
  readonly sources: string;
  readonly sourceLinks: readonly BenchmarkSourceLink[];
  readonly isUserCountry: boolean;
}

export function getBenchmarkAriaSort(
  activeColumn: BenchmarkSortColumn,
  direction: BenchmarkSortDirection,
  column: BenchmarkSortColumn,
): 'ascending' | 'descending' | 'none' {
  if (activeColumn !== column) return 'none';
  return direction === 'asc' ? 'ascending' : 'descending';
}
