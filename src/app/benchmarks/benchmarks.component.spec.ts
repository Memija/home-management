import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CountryFactsService } from '../services/country-facts.service';
import { ElectricityCountryFactsService } from '../services/electricity-country-facts.service';
import { HeatingFactsService } from '../services/heating-facts.service';
import { HouseholdService } from '../services/household.service';
import { LanguageService } from '../services/language.service';
import { BenchmarksComponent } from './benchmarks.component';

describe('BenchmarksComponent', () => {
  let fixture: ComponentFixture<BenchmarksComponent>;
  let component: BenchmarksComponent;
  let householdService: HouseholdService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BenchmarksComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    await TestBed.inject(LanguageService).ready;
    householdService = TestBed.inject(HouseholdService);
    householdService.members.set([]);
    householdService.address.set(null);
    fixture = TestBed.createComponent(BenchmarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render a single h1 heading and country benchmark rows', () => {
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(component.rows().length).toBeGreaterThan(50);
  });

  it('should scale water and electricity benchmarks when household size changes', () => {
    const deSize2 = component.rows().find((row) => row.code === 'de');
    expect(deSize2?.waterDailyLiters).toBe(256);
    expect(deSize2?.electricityYearlyKwh).toBe(3000);

    component.setHouseholdSize(4);
    fixture.detectChanges();

    const deSize4 = component.rows().find((row) => row.code === 'de');
    expect(deSize4?.waterDailyLiters).toBe(512);
    expect(deSize4?.electricityYearlyKwh).toBe(6000);
    expect(deSize4?.heatingYearlyKwh).toBe(13500);
  });

  it('should filter countries by search query', () => {
    component.searchQuery.set('pl');
    fixture.detectChanges();

    expect(component.rows().some((row) => row.code === 'pl')).toBe(true);
    expect(component.rows().length).toBeLessThan(10);
  });

  it('should display N/A for tropical countries with 0 kWh space heating', () => {
    component.searchQuery.set('ht');
    fixture.detectChanges();

    const haitiRow = component.rows().find((row) => row.code === 'ht');
    expect(haitiRow?.heatingYearlyKwh).toBe(0);
    expect(haitiRow?.sources).not.toContain('N/A');

    const naBadge = fixture.nativeElement.querySelector('.na-val');
    expect(naBadge).toBeTruthy();
    expect(naBadge.textContent.trim()).toContain('N/A');
  });

  it('should explain why space heating does not change with household size', () => {
    const headerTooltip = fixture.nativeElement.querySelector('.header-info-tooltip');
    expect(headerTooltip).toBeTruthy();
    expect(headerTooltip.getAttribute('aria-label')).toContain('100 m²');
    expect(headerTooltip.getAttribute('aria-label')).toContain('number of occupants');
  });

  it('should provide valid official URLs for every benchmark source link in the table', () => {
    for (const row of component.rows()) {
      expect(row.sourceLinks.length).toBeGreaterThan(0);
      for (const link of row.sourceLinks) {
        expect(link.url, `Missing URL for source "${link.label}" (${row.code})`).toMatch(
          /^https?:\/\//,
        );
      }
    }

    const firstSourceLink = fixture.nativeElement.querySelector(
      '.sources-cell a.source-link',
    ) as HTMLAnchorElement | null;
    expect(firstSourceLink).toBeTruthy();
    expect(firstSourceLink?.getAttribute('target')).toBe('_blank');
    expect(firstSourceLink?.getAttribute('rel')).toContain('noopener');
  });

  it('should preselect the user household size when household members exist', () => {
    expect(component.householdSize()).toBe(2);

    householdService.members.set([
      { id: '1', name: 'Alice', surname: 'Smith', avatar: '/avatars/batman.jpg' },
      { id: '2', name: 'Bob', surname: 'Smith', avatar: '/avatars/superman.jpg' },
      { id: '3', name: 'Charlie', surname: 'Smith', avatar: '/avatars/flash.jpg' },
    ]);
    fixture.detectChanges();

    expect(component.householdSize()).toBe(3);
    const deRow = component.rows().find((row) => row.code === 'de');
    expect(deRow?.waterDailyLiters).toBe(384);
    expect(deRow?.electricityYearlyKwh).toBe(4500);

    component.setHouseholdSize(1);
    fixture.detectChanges();
    expect(component.householdSize()).toBe(1);
  });

  it('should not mark a default household size button active during SSR prerendering', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BenchmarksComponent],
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();

    await TestBed.inject(LanguageService).ready;
    const ssrFixture = TestBed.createComponent(BenchmarksComponent);
    ssrFixture.detectChanges();

    const activeButtons = ssrFixture.nativeElement.querySelectorAll('.size-btn.active');
    expect(activeButtons.length).toBe(0);
  });

  it('should sort rows by country, water, electricity, and heating in both directions', () => {
    expect(component.sortColumn()).toBe('country');
    expect(component.sortDirection()).toBe('asc');
    expect(component.getAriaSort('country')).toBe('ascending');
    expect(component.getAriaSort('water')).toBe('none');

    component.toggleSort('water');
    expect(component.sortColumn()).toBe('water');
    expect(component.sortDirection()).toBe('desc');
    expect(component.getAriaSort('water')).toBe('descending');
    const waterDesc = component.rows();
    expect(waterDesc[0].waterDailyLiters).toBeGreaterThanOrEqual(
      waterDesc[waterDesc.length - 1].waterDailyLiters,
    );

    component.toggleSort('water');
    expect(component.sortDirection()).toBe('asc');
    const waterAsc = component.rows();
    expect(waterAsc[0].waterDailyLiters).toBeLessThanOrEqual(
      waterAsc[waterAsc.length - 1].waterDailyLiters,
    );

    component.toggleSort('electricity');
    expect(component.sortColumn()).toBe('electricity');
    expect(component.sortDirection()).toBe('desc');
    const elecDesc = component.rows();
    expect(elecDesc[0].electricityYearlyKwh).toBeGreaterThanOrEqual(
      elecDesc[elecDesc.length - 1].electricityYearlyKwh,
    );

    component.toggleSort('heating');
    expect(component.sortColumn()).toBe('heating');
    expect(component.sortDirection()).toBe('desc');
    const heatDesc = component.rows();
    expect(heatDesc[0].heatingYearlyKwh).toBeGreaterThanOrEqual(
      heatDesc[heatDesc.length - 1].heatingYearlyKwh,
    );
  });

  it('should pin and mark the user country at the top of the table when address country is set', () => {
    householdService.address.set({
      streetName: 'Main St',
      streetNumber: '1',
      city: 'Berlin',
      zipCode: '10115',
      country: 'de',
    });
    fixture.detectChanges();

    expect(component.rows()[0].code).toBe('de');
    expect(component.rows()[0].isUserCountry).toBe(true);

    component.toggleSort('water');
    fixture.detectChanges();
    expect(component.rows()[0].code).toBe('de');

    const userRow = fixture.nativeElement.querySelector('tr.user-country-row');
    expect(userRow).toBeTruthy();
    expect(userRow?.textContent).toContain('Germany');
  });

  it('should render the disclaimer footnote linking to Privacy & Legal', () => {
    const footnote = fixture.nativeElement.querySelector('.benchmarks-disclaimer-footnote');
    expect(footnote).toBeTruthy();
    const link = footnote?.querySelector('a.disclaimer-link');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/dashboard/privacy');
  });

  it('should open country facts modal when clicking a country and only load active category facts on demand', async () => {
    const waterFactsService = TestBed.inject(CountryFactsService);
    const electricityFactsService = TestBed.inject(ElectricityCountryFactsService);
    const heatingFactsService = TestBed.inject(HeatingFactsService);

    const waterSpy = vi.spyOn(waterFactsService, 'getFacts').mockReturnValue(['Water fact 1']);
    const electricitySpy = vi
      .spyOn(electricityFactsService, 'getFacts')
      .mockReturnValue(['Electricity fact 1']);
    const heatingSpy = vi
      .spyOn(heatingFactsService, 'getFacts')
      .mockReturnValue(['Heating fact 1']);

    // Nothing loaded before clicking a country
    expect(component.selectedCountry()).toBeNull();
    expect(waterSpy).not.toHaveBeenCalled();
    expect(electricitySpy).not.toHaveBeenCalled();
    expect(heatingSpy).not.toHaveBeenCalled();

    // Filter to Germany and click country trigger
    component.searchQuery.set('germany');
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      'button.country-trigger',
    ) as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();
    trigger?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.selectedCountry()?.code).toBe('de');
    const modal = fixture.nativeElement.querySelector('.country-facts-modal');
    expect(modal).toBeTruthy();
    expect(modal?.textContent).toContain('Water fact 1');

    // Only water facts requested initially; electricity & heating not loaded yet
    expect(waterSpy).toHaveBeenCalledWith('de');
    expect(electricitySpy).not.toHaveBeenCalled();
    expect(heatingSpy).not.toHaveBeenCalled();

    // Switch to Electricity tab -> loads electricity facts only
    const electricityTab = fixture.nativeElement.querySelector(
      '#facts-tab-electricity',
    ) as HTMLButtonElement | null;
    electricityTab?.click();
    fixture.detectChanges();

    expect(electricitySpy).toHaveBeenCalledWith('de');
    expect(heatingSpy).not.toHaveBeenCalled();
    expect(modal?.textContent).toContain('Electricity fact 1');

    // Switch to Heating tab -> loads heating facts
    const heatingTab = fixture.nativeElement.querySelector(
      '#facts-tab-heating',
    ) as HTMLButtonElement | null;
    heatingTab?.click();
    fixture.detectChanges();

    expect(heatingSpy).toHaveBeenCalledWith('de');
    expect(modal?.textContent).toContain('Heating fact 1');

    // Close modal
    const closeBtn = fixture.nativeElement.querySelector(
      '.country-facts-modal .close-btn',
    ) as HTMLButtonElement | null;
    closeBtn?.click();
    fixture.detectChanges();

    expect(component.selectedCountry()).toBeNull();
  });
});
