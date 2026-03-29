import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountrySelectorComponent } from './country-selector.component';
import { CountryService, CountryInfo } from '../../services/country.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';
import { By } from '@angular/platform-browser';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('CountrySelectorComponent', () => {
  let component: CountrySelectorComponent;
  let fixture: ComponentFixture<CountrySelectorComponent>;
  let countryServiceMock: any;
  let languageServiceMock: any;

  const mockCountries: CountryInfo[] = [
    { code: 'de', translationKey: 'COUNTRIES.GERMANY' },
    { code: 'at', translationKey: 'COUNTRIES.AUSTRIA' },
    { code: 'ch', translationKey: 'COUNTRIES.SWITZERLAND' },
    { code: 'fr', translationKey: 'COUNTRIES.FRANCE' },
    { code: 'us', translationKey: 'COUNTRIES.USA' },
    { code: 'gb', translationKey: 'COUNTRIES.UNITED_KINGDOM' },
  ];

  const translationMap: Record<string, string> = {
    'COUNTRIES.GERMANY': 'Germany',
    'COUNTRIES.AUSTRIA': 'Austria',
    'COUNTRIES.SWITZERLAND': 'Switzerland',
    'COUNTRIES.FRANCE': 'France',
    'COUNTRIES.USA': 'United States',
    'COUNTRIES.UNITED_KINGDOM': 'United Kingdom',
  };

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => translationMap[key] || key),
    };

    countryServiceMock = {
      getCountries: vi
        .fn()
        .mockReturnValue(mockCountries.map((c) => translationMap[c.translationKey]).sort()),
      getCountryInfoByCode: vi
        .fn()
        .mockImplementation((code: string) =>
          mockCountries.find((c) => c.code === code.toLowerCase()),
        ),
      getCountryInfoByName: vi.fn().mockImplementation((name: string) => {
        const normalized = name.toLowerCase().trim();
        return mockCountries.find(
          (c) => translationMap[c.translationKey].toLowerCase() === normalized,
        );
      }),
      getAllCountryData: vi.fn().mockReturnValue(mockCountries),
    };

    await TestBed.configureTestingModule({
      imports: [CountrySelectorComponent],
    })
      .overrideComponent(CountrySelectorComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .overrideProvider(CountryService, { useValue: countryServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(CountrySelectorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Creation and Defaults', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have empty countryCode by default', () => {
      expect(component.countryCode).toBe('');
    });

    it('should have default placeholder', () => {
      expect(component.placeholder).toBe('SETTINGS.SEARCH_COUNTRY');
    });

    it('should have no error state by default', () => {
      expect(component.hasError).toBe(false);
    });

    it('should have empty search field by default', () => {
      expect((component as any)._countrySearch()).toBe('');
    });
  });

  describe('countryCode setter', () => {
    it('should set the internal country code signal', () => {
      component.countryCode = 'de';
      expect((component as any)._countryCode()).toBe('de');
    });

    it('should update search field with translated country name', () => {
      component.countryCode = 'de';
      expect((component as any)._countrySearch()).toBe('Germany');
    });

    it('should call countryService.getCountryInfoByCode', () => {
      component.countryCode = 'fr';
      expect(countryServiceMock.getCountryInfoByCode).toHaveBeenCalledWith('fr');
    });

    it('should not update search if code is empty', () => {
      component.countryCode = '';
      expect((component as any)._countrySearch()).toBe('');
    });

    it('should not update search if code is not found', () => {
      countryServiceMock.getCountryInfoByCode.mockReturnValue(undefined);
      component.countryCode = 'xx';
      expect((component as any)._countrySearch()).toBe('');
    });

    it('should return the country code via getter', () => {
      component.countryCode = 'at';
      expect(component.countryCode).toBe('at');
    });
  });

  describe('onSearchChange', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update the search signal', () => {
      component.onSearchChange('Germany');
      expect((component as any)._countrySearch()).toBe('Germany');
    });

    it('should set country code when exact match found', () => {
      component.onSearchChange('Germany');
      expect((component as any)._countryCode()).toBe('de');
    });

    it('should emit countryCodeChange on exact match', () => {
      const spy = vi.fn();
      component.countryCodeChange.subscribe(spy);

      component.onSearchChange('Germany');
      expect(spy).toHaveBeenCalledWith('de');
    });

    it('should emit empty validationErrors on exact match', () => {
      const spy = vi.fn();
      component.validationErrors.subscribe(spy);

      component.onSearchChange('Germany');
      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should clear country code when no match found', () => {
      component.countryCode = 'de';
      component.onSearchChange('NonExistentCountry');
      expect((component as any)._countryCode()).toBe('');
    });

    it('should emit empty string for countryCodeChange when no match', () => {
      const spy = vi.fn();
      component.countryCodeChange.subscribe(spy);

      component.onSearchChange('InvalidCountry');
      expect(spy).toHaveBeenCalledWith('');
    });

    it('should emit validation error when search is non-empty and no match', () => {
      const spy = vi.fn();
      component.validationErrors.subscribe(spy);

      component.onSearchChange('InvalidCountry');
      expect(spy).toHaveBeenCalledWith(['SETTINGS.ERRORS.INVALID_COUNTRY']);
    });

    it('should emit no validation errors when search is empty', () => {
      const spy = vi.fn();
      component.validationErrors.subscribe(spy);

      component.onSearchChange('');
      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should emit no validation errors when search is only whitespace', () => {
      const spy = vi.fn();
      component.validationErrors.subscribe(spy);

      component.onSearchChange('   ');
      expect(spy).toHaveBeenCalledWith([]);
    });
  });

  describe('selectCountry', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set country code when valid country is selected', () => {
      component.selectCountry('Germany');
      expect((component as any)._countryCode()).toBe('de');
    });

    it('should update search field with selected country name', () => {
      component.selectCountry('France');
      expect((component as any)._countrySearch()).toBe('France');
    });

    it('should emit countryCodeChange with the country code', () => {
      const spy = vi.fn();
      component.countryCodeChange.subscribe(spy);

      component.selectCountry('Austria');
      expect(spy).toHaveBeenCalledWith('at');
    });

    it('should clear validation errors after selection', () => {
      const spy = vi.fn();
      component.validationErrors.subscribe(spy);

      component.selectCountry('Germany');
      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should fall back to name as code if country info not found', () => {
      countryServiceMock.getCountryInfoByName.mockReturnValue(undefined);

      const spy = vi.fn();
      component.countryCodeChange.subscribe(spy);

      component.selectCountry('UnknownCountry');
      expect((component as any)._countryCode()).toBe('UnknownCountry');
      expect((component as any)._countrySearch()).toBe('UnknownCountry');
      expect(spy).toHaveBeenCalledWith('UnknownCountry');
    });
  });

  describe('filteredCountries', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return empty array when search is empty', () => {
      (component as any)._countrySearch.set('');
      expect((component as any).filteredCountries()).toEqual([]);
    });

    it('should return empty array when search is only whitespace', () => {
      (component as any)._countrySearch.set('   ');
      expect((component as any).filteredCountries()).toEqual([]);
    });

    it('should return matching countries for partial search', () => {
      (component as any)._countrySearch.set('ger');
      const results = (component as any).filteredCountries();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c: string) => c.toLowerCase().includes('ger'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      (component as any)._countrySearch.set('GER');
      const results = (component as any).filteredCountries();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array when exact match exists (already selected)', () => {
      (component as any)._countrySearch.set('Germany');
      const results = (component as any).filteredCountries();
      expect(results).toEqual([]);
    });

    it('should limit results to 10 entries', () => {
      // Create a mock that returns many matching countries
      countryServiceMock.getCountries.mockReturnValue(
        Array.from({ length: 20 }, (_, i) => `Country ${i}`),
      );
      (component as any)._countrySearch.set('Country');
      const results = (component as any).filteredCountries();
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should exclude the currently selected country from results', () => {
      // Set a country code first
      (component as any)._countryCode.set('de');
      // Search for something that would match Germany
      (component as any)._countrySearch.set('ger');
      const results = (component as any).filteredCountries();
      // Germany should be excluded since it's the current display name
      const hasGermany = results.some((c: string) => c.toLowerCase() === 'germany');
      expect(hasGermany).toBe(false);
    });
  });

  describe('displayName', () => {
    it('should return empty string when no country code is set', () => {
      fixture.detectChanges();
      expect((component as any).displayName()).toBe('');
    });

    it('should return translated name for valid country code', () => {
      (component as any)._countryCode.set('de');
      fixture.detectChanges();

      expect((component as any).displayName()).toBe('Germany');
    });

    it('should return code as fallback when country info not found', () => {
      countryServiceMock.getCountryInfoByCode.mockReturnValue(undefined);
      (component as any)._countryCode.set('xx');
      fixture.detectChanges();

      expect((component as any).displayName()).toBe('xx');
    });

    it('should react to language changes', () => {
      (component as any)._countryCode.set('de');
      fixture.detectChanges();

      // First call with 'en'
      (component as any).displayName();

      // Simulate language change
      languageServiceMock.currentLang.set('de');
      // displayName re-evaluates due to signal dependency
      (component as any).displayName();

      // translate should have been called with the translation key
      expect(languageServiceMock.translate).toHaveBeenCalledWith('COUNTRIES.GERMANY');
    });
  });

  describe('trackByCountry', () => {
    it('should return the country string itself', () => {
      expect(component.trackByCountry(0, 'Germany')).toBe('Germany');
      expect(component.trackByCountry(5, 'France')).toBe('France');
    });

    it('should handle empty string', () => {
      expect(component.trackByCountry(0, '')).toBe('');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle setting countryCode multiple times', () => {
      component.countryCode = 'de';
      expect((component as any)._countrySearch()).toBe('Germany');

      component.countryCode = 'fr';
      expect((component as any)._countrySearch()).toBe('France');

      component.countryCode = 'us';
      expect((component as any)._countrySearch()).toBe('United States');
    });

    it('should handle rapid search changes', () => {
      component.onSearchChange('Ge');
      component.onSearchChange('Ger');
      component.onSearchChange('Germ');
      component.onSearchChange('Germany');

      expect((component as any)._countryCode()).toBe('de');
    });

    it('should handle search followed by clear', () => {
      const codeSpy = vi.fn();
      const errorSpy = vi.fn();
      component.countryCodeChange.subscribe(codeSpy);
      component.validationErrors.subscribe(errorSpy);

      component.onSearchChange('Germany');
      expect(codeSpy).toHaveBeenCalledWith('de');

      component.onSearchChange('');
      expect(codeSpy).toHaveBeenCalledWith('');
      expect(errorSpy).toHaveBeenCalledWith([]);
    });

    it('should handle selecting country then typing partial text', () => {
      component.selectCountry('Germany');
      expect((component as any)._countryCode()).toBe('de');

      component.onSearchChange('Aust');
      // Partial text — no match, code should be cleared
      expect((component as any)._countryCode()).toBe('');
    });

    it('should handle hasError input', () => {
      component.hasError = true;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.nativeElement.classList.contains('error')).toBe(true);
    });

    it('should not have error class when hasError is false', () => {
      component.hasError = false;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.nativeElement.classList.contains('error')).toBe(false);
    });

    it('should handle special characters in search', () => {
      component.onSearchChange('Österreich');
      // No match expected in our mock, but should not throw
      expect((component as any)._countrySearch()).toBe('Österreich');
    });

    it('should handle country code case insensitivity via getter', () => {
      countryServiceMock.getCountryInfoByCode.mockImplementation((code: string) =>
        mockCountries.find((c) => c.code === code.toLowerCase()),
      );
      component.countryCode = 'DE';
      // Should find Germany via case-insensitive lookup in the mock
      expect(countryServiceMock.getCountryInfoByCode).toHaveBeenCalledWith('DE');
    });
  });

  describe('DOM Rendering', () => {
    it('should render the country-selector container', () => {
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.country-selector'));
      expect(container).toBeTruthy();
    });

    it('should render an input element', () => {
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input).toBeTruthy();
      expect(input.nativeElement.type).toBe('text');
    });

    it('should not show dropdown when no filtered countries', () => {
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(By.css('.country-dropdown'));
      expect(dropdown).toBeNull();
    });

    it('should have proper accessibility attributes on input', () => {
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.nativeElement.getAttribute('autocomplete')).toBe('country-name');
    });

    it('should set placeholder using translate pipe', () => {
      component.placeholder = 'SETTINGS.SEARCH_COUNTRY';
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      // MockTranslatePipe returns the key itself
      expect(input.nativeElement.getAttribute('placeholder')).toBe('SETTINGS.SEARCH_COUNTRY');
    });
  });
});
