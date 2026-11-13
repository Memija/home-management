import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageService } from '../../services/language.service';
import { CountryBenchmarkRow } from '../benchmarks.types';
import { BenchmarksTableComponent } from './benchmarks-table.component';

const MOCK_ROWS: readonly CountryBenchmarkRow[] = [
  {
    code: 'de',
    name: 'Germany',
    flagUrl: '/flags/de.svg',
    waterDailyLiters: 256,
    electricityYearlyKwh: 3000,
    heatingYearlyKwh: 13500,
    sources: 'BDEW',
    sourceLinks: [{ label: 'BDEW', url: 'https://www.bdew.de/' }],
    isUserCountry: true,
  },
  {
    code: 'ht',
    name: 'Haiti',
    flagUrl: '/flags/ht.svg',
    waterDailyLiters: 40,
    electricityYearlyKwh: 200,
    heatingYearlyKwh: 0,
    sources: 'WHO',
    sourceLinks: [{ label: 'WHO' }],
    isUserCountry: false,
  },
];

describe('BenchmarksTableComponent', () => {
  let fixture: ComponentFixture<BenchmarksTableComponent>;
  let component: BenchmarksTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BenchmarksTableComponent],
    }).compileComponents();

    await TestBed.inject(LanguageService).ready;
    fixture = TestBed.createComponent(BenchmarksTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', MOCK_ROWS);
    fixture.componentRef.setInput('sortColumn', 'country');
    fixture.componentRef.setInput('sortDirection', 'asc');
    fixture.detectChanges();
  });

  it('should render rows, highlight user country, and emit countrySelected when clicked', () => {
    const spy = vi.fn();
    component.countrySelected.subscribe(spy);

    const userRow = fixture.nativeElement.querySelector('tr.user-country-row');
    expect(userRow).toBeTruthy();

    const trigger = userRow.querySelector('button.country-trigger') as HTMLButtonElement;
    trigger.click();

    expect(spy).toHaveBeenCalledWith(MOCK_ROWS[0]);
  });

  it('should emit sortChange when a column header sort button is clicked', () => {
    const spy = vi.fn();
    component.sortChange.subscribe(spy);

    const waterBtn = fixture.nativeElement.querySelector(
      'button.sort-btn[data-col="water"]',
    ) as HTMLButtonElement;
    waterBtn.click();

    expect(spy).toHaveBeenCalledWith('water');
  });

  it('should display N/A for 0 kWh heating and plain text when a source has no URL', () => {
    expect(fixture.nativeElement.querySelector('.na-val')?.textContent.trim()).toContain('N/A');
    const sourceCells = fixture.nativeElement.querySelectorAll('.sources-cell');
    expect(sourceCells[0].querySelector('a.source-link')).toBeTruthy();
    expect(sourceCells[1].querySelector('a.source-link')).toBeNull();
  });
});
