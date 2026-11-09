import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CountryFactsService } from '../../services/country-facts.service';
import { ElectricityCountryFactsService } from '../../services/electricity-country-facts.service';
import { HeatingFactsService } from '../../services/heating-facts.service';
import { LanguageService } from '../../services/language.service';
import type { CountryBenchmarkRow } from '../benchmarks.component';
import { CountryFactsModalComponent } from './country-facts-modal.component';

const MOCK_COUNTRY: CountryBenchmarkRow = {
  code: 'de',
  name: 'Germany',
  flagUrl: '/flags/de.png',
  waterDailyLiters: 256,
  electricityYearlyKwh: 3000,
  heatingYearlyKwh: 13500,
  sources: 'Destatis · BDEW',
  sourceLinks: [{ label: 'Destatis', url: 'https://www.destatis.de' }],
  isUserCountry: false,
};

const MOCK_TROPICAL_COUNTRY: CountryBenchmarkRow = {
  ...MOCK_COUNTRY,
  code: 'ht',
  name: 'Haiti',
  flagUrl: '/flags/ht.png',
  heatingYearlyKwh: 0,
};

describe('CountryFactsModalComponent', () => {
  let fixture: ComponentFixture<CountryFactsModalComponent>;
  let component: CountryFactsModalComponent;
  let countryFactsService: CountryFactsService;
  let electricityFactsService: ElectricityCountryFactsService;
  let heatingFactsService: HeatingFactsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryFactsModalComponent],
    }).compileComponents();

    await TestBed.inject(LanguageService).ready;
    countryFactsService = TestBed.inject(CountryFactsService);
    electricityFactsService = TestBed.inject(ElectricityCountryFactsService);
    heatingFactsService = TestBed.inject(HeatingFactsService);

    vi.spyOn(countryFactsService, 'getFacts').mockReturnValue(['Water fact 1', 'Water fact 2']);
    vi.spyOn(electricityFactsService, 'getFacts').mockReturnValue(['Electricity fact 1']);
    vi.spyOn(heatingFactsService, 'getFacts').mockReturnValue(['Heating fact 1']);

    fixture = TestBed.createComponent(CountryFactsModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('country', MOCK_COUNTRY);
    fixture.detectChanges();
  });

  it('should create and render country header and metrics', () => {
    expect(component).toBeTruthy();

    const title = fixture.nativeElement.querySelector('#country-facts-modal-title');
    expect(title?.textContent).toContain('Germany');

    const waterTab = fixture.nativeElement.querySelector('#facts-tab-water');
    const electricityTab = fixture.nativeElement.querySelector('#facts-tab-electricity');
    const heatingTab = fixture.nativeElement.querySelector('#facts-tab-heating');

    expect(waterTab?.textContent).toContain('256 L/d');
    expect(electricityTab?.textContent).toContain('3000 kWh');
    expect(heatingTab?.textContent).toContain('13500 kWh');
  });

  it('should display N/A in the heating tab metric when country heatingYearlyKwh is 0', () => {
    fixture.componentRef.setInput('country', MOCK_TROPICAL_COUNTRY);
    fixture.detectChanges();

    const heatingTab = fixture.nativeElement.querySelector('#facts-tab-heating');
    expect(heatingTab?.textContent).toContain('N/A');
    expect(heatingTab?.textContent).not.toContain('0 kWh');
  });

  it('should default to the water category and load water facts only', () => {
    expect(component.activeCategory()).toBe('water');
    expect(countryFactsService.getFacts).toHaveBeenCalledWith('de');
    expect(electricityFactsService.getFacts).not.toHaveBeenCalled();
    expect(heatingFactsService.getFacts).not.toHaveBeenCalled();

    const factItems = fixture.nativeElement.querySelectorAll('.fact-item');
    expect(factItems.length).toBe(2);
    expect(factItems[0].textContent).toContain('Water fact 1');
  });

  it('should switch categories when clicking tabs and fetch corresponding facts', () => {
    const electricityTab = fixture.nativeElement.querySelector(
      '#facts-tab-electricity',
    ) as HTMLButtonElement;
    electricityTab.click();
    fixture.detectChanges();

    expect(component.activeCategory()).toBe('electricity');
    expect(electricityTab.getAttribute('aria-selected')).toBe('true');
    expect(electricityFactsService.getFacts).toHaveBeenCalledWith('de');
    expect(fixture.nativeElement.querySelector('.fact-item')?.textContent).toContain(
      'Electricity fact 1',
    );

    const heatingTab = fixture.nativeElement.querySelector(
      '#facts-tab-heating',
    ) as HTMLButtonElement;
    heatingTab.click();
    fixture.detectChanges();

    expect(component.activeCategory()).toBe('heating');
    expect(heatingTab.getAttribute('aria-selected')).toBe('true');
    expect(heatingFactsService.getFacts).toHaveBeenCalledWith('de');
    expect(fixture.nativeElement.querySelector('.fact-item')?.textContent).toContain(
      'Heating fact 1',
    );
  });

  it('should reset activeCategory when country or initialCategory input changes', () => {
    component.selectCategory('heating');
    expect(component.activeCategory()).toBe('heating');

    fixture.componentRef.setInput('country', MOCK_TROPICAL_COUNTRY);
    fixture.detectChanges();
    expect(component.activeCategory()).toBe('water');

    fixture.componentRef.setInput('initialCategory', 'electricity');
    fixture.detectChanges();
    expect(component.activeCategory()).toBe('electricity');
  });

  it('should render empty loading state when no facts are returned', () => {
    vi.mocked(countryFactsService.getFacts).mockReturnValue([]);
    fixture.componentRef.setInput('country', { ...MOCK_COUNTRY, code: 'fr' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.facts-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.fact-item').length).toBe(0);
  });

  it('should emit closeModal when clicking the close button', () => {
    const emitSpy = vi.spyOn(component.closeModal, 'emit');
    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;

    closeBtn.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit closeModal when clicking the backdrop overlay but not when clicking modal content', () => {
    const emitSpy = vi.spyOn(component.closeModal, 'emit');
    const overlay = fixture.nativeElement.querySelector('.modal-overlay') as HTMLElement;
    const content = fixture.nativeElement.querySelector('.modal-content') as HTMLElement;

    content.click();
    expect(emitSpy).not.toHaveBeenCalled();

    overlay.click();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit closeModal when pressing Escape', () => {
    const emitSpy = vi.spyOn(component.closeModal, 'emit');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
