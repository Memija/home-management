import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComparisonNoteComponent } from './comparison-note.component';
import { HouseholdService } from '../../services/household.service';
import { WaterAveragesService } from '../../services/water-averages.service';
import { LanguageService } from '../../services/language.service';
import { CountryFactsService } from '../../services/country-facts.service';
import { HeatingFactsService } from '../../services/heating-facts.service';
import { HeatingAveragesService } from '../../services/heating-averages.service';
import { ElectricityCountryFactsService } from '../../services/electricity-country-facts.service';
import { ElectricityAveragesService } from '../../services/electricity-averages.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ComparisonNoteComponent', () => {
  let component: ComparisonNoteComponent;
  let fixture: ComponentFixture<ComparisonNoteComponent>;

  // Mocks
  const mockHouseholdService = {
    members: signal(['John', 'Jane']),
    address: signal({ country: 'DE' })
  };

  const mockWaterAveragesService = {
    getAvailableCountries: vi.fn().mockReturnValue([
      { code: 'DE', translationKey: 'COUNTRY.DE', average: 120 },
      { code: 'US', translationKey: 'COUNTRY.US', average: 300 }
    ]),
    getFlagUrl: vi.fn().mockReturnValue('flag-url.png')
  };

  const mockLanguageService = {
    translate: vi.fn((key: string, params?: any) => {
      if (key === 'COUNTRY.DE') return 'Germany';
      if (key === 'COUNTRY.US') return 'United States';
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    }),
    currentLang: signal('en')
  };

  const mockCountryFactsService = {
    getFactByIndex: vi.fn().mockReturnValue({ message: 'Water fact', title: 'Did you know?' })
  };

  const mockHeatingFactsService = {
    getFactByIndex: vi.fn().mockReturnValue({ message: 'Heating fact', title: 'Heating Tip' })
  };

  const mockHeatingAveragesService = {
    getAverageKwhPerYear: vi.fn().mockReturnValue(15000)
  };

  const mockElectricityFactsService = {
    getFactByIndex: vi.fn().mockReturnValue({ message: 'Electricity fact', title: 'Power Tip' })
  };

  const mockElectricityAveragesService = {
    getAverageKwhPerPersonPerYear: vi.fn().mockReturnValue(2500)
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [ComparisonNoteComponent],
      providers: [
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: WaterAveragesService, useValue: mockWaterAveragesService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: CountryFactsService, useValue: mockCountryFactsService },
        { provide: HeatingFactsService, useValue: mockHeatingFactsService },
        { provide: HeatingAveragesService, useValue: mockHeatingAveragesService },
        { provide: ElectricityCountryFactsService, useValue: mockElectricityFactsService },
        { provide: ElectricityAveragesService, useValue: mockElectricityAveragesService },
      ]
    })
      .overrideComponent(ComparisonNoteComponent, {
        set: { templateUrl: '', styleUrl: '', template: '' }
      });

    fixture = TestBed.createComponent(ComparisonNoteComponent);
    component = fixture.componentInstance;

    // Set required inputs using componentRef.setInput()
    fixture.componentRef.setInput('records', [{ date: new Date() }, { date: new Date() }, { date: new Date() }]);

    // Set default countries lists
    fixture.componentRef.setInput('heatingCountries', [
      { code: 'DE', nameKey: 'COUNTRY.DE' },
      { code: 'US', nameKey: 'COUNTRY.US' }
    ]);
    fixture.componentRef.setInput('electricityCountries', [
      { code: 'DE', nameKey: 'COUNTRY.DE' },
      { code: 'US', nameKey: 'COUNTRY.US' }
    ]);

    // Default type
    fixture.componentRef.setInput('type', 'water');

    TestBed.flushEffects();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Computed Properties', () => {
    it('should calculate familySize correctly', () => {
      expect(component['familySize']()).toBe(2);
    });

    it('should check if there is sufficient data', () => {
      // Initial records length is 3
      expect(component['hasSufficientDataForComparison']()).toBe(true);

      // Change input to less records
      fixture.componentRef.setInput('records', [{ date: new Date() }]);
      TestBed.flushEffects();
      expect(component['hasSufficientDataForComparison']()).toBe(false);
    });

    it('should get correct effectiveComparisonCountryCode from household service', () => {
      // Mock user country 'DE' is valid
      expect(component['effectiveComparisonCountryCode']()).toBe('DE');
    });

    it('should fallback to DE if user country is missing', () => {
      mockHouseholdService.address.set({ country: '' } as any);
      TestBed.flushEffects();
      expect(component['effectiveComparisonCountryCode']()).toBe('DE');
    });

    it('should fallback to DE if user country is invalid', () => {
      mockHouseholdService.address.set({ country: 'INVALID' } as any);
      TestBed.flushEffects();
      expect(component['effectiveComparisonCountryCode']()).toBe('DE');
    });

    it('should use manually selected comparison country', () => {
      component['onComparisonCountryChange']('US');
      TestBed.flushEffects();
      expect(component['effectiveComparisonCountryCode']()).toBe('US');
    });

    it('should get effectiveComparisonCountryName translated', () => {
      // Default DE -> Germany
      expect(component['effectiveComparisonCountryName']()).toBe('Germany');

      // Switch to US
      component['onComparisonCountryChange']('US');
      TestBed.flushEffects();
      expect(component['effectiveComparisonCountryName']()).toBe('United States');
    });
  });

  describe('Facts Logic', () => {
    it('should get water fact', () => {
      fixture.componentRef.setInput('type', 'water');
      TestBed.flushEffects();
      expect(component['countryFact']()).toEqual({ message: 'Water fact', title: 'Did you know?' });
    });

    it('should get heating fact', () => {
      fixture.componentRef.setInput('type', 'heating');
      TestBed.flushEffects();
      expect(component['countryFact']()).toBe('Heating fact');
      expect(component['heatingFactTitle']()).toBe('Heating Tip');
    });

    it('should get electricity fact', () => {
      fixture.componentRef.setInput('type', 'electricity');
      TestBed.flushEffects();
      expect(component['countryFact']()).toBe('Electricity fact');
      expect(component['electricityFactTitle']()).toBe('Power Tip');
    });

    it('should refresh fact on manual refresh', () => {
      const initialSeed = component['factSeed']();
      vi.advanceTimersByTime(100); // Advance time to ensure Date.now checks different time
      component['refreshFact']();
      TestBed.flushEffects();
      expect(component['factSeed']()).not.toBe(initialSeed);
    });

    it('should refresh fact on chart view change', () => {
      const initialSeed = component['factSeed']();
      vi.advanceTimersByTime(100);
      fixture.componentRef.setInput('chartView', 'average');
      TestBed.flushEffects();
      expect(component['factSeed']()).not.toBe(initialSeed);
    });
  });

  describe(' Comparison Text', () => {
    it('should translate water comparison text with correct params', () => {
      fixture.componentRef.setInput('type', 'water');
      TestBed.flushEffects();

      // The mock translator returns the key + params stringified
      const text = component['comparisonText']();
      expect(text).toContain('CHART.COMPARISON_NOTE_COUNTRY');
      expect(text).toContain('"country":"Germany"');
      expect(text).toContain('"average":120'); // Water average for DE
      expect(text).toContain('"size":2');
    });

    it('should translate heating comparison text', () => {
      fixture.componentRef.setInput('type', 'heating');
      TestBed.flushEffects();

      const text = component['comparisonText']();
      expect(text).toContain('CHART.COMPARISON_NOTE_COUNTRY_HEATING');
      expect(text).toContain('"country":"Germany"');
      expect(text).toContain('"average":15000');
    });

    it('should translate electricity comparison text', () => {
      fixture.componentRef.setInput('type', 'electricity');
      TestBed.flushEffects();

      const text = component['comparisonText']();
      expect(text).toContain('CHART.COMPARISON_NOTE_COUNTRY_ELECTRICITY');
      expect(text).toContain('"country":"Germany"');
      expect(text).toContain('"average":2500');
      expect(text).toContain('"size":2');
    });
  });

  describe('Available Countries', () => {
    it('should sort water countries by translated name', () => {
      const sorted = component['waterCountries']();
      // Germany vs United States -> G comes before U
      expect(sorted[0].code).toBe('DE');
      expect(sorted[1].code).toBe('US');
    });
  });
});
