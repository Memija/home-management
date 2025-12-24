import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';

export interface CountryInfo {
  code: string;
  translationKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private languageService = inject(LanguageService);

  // Country codes mapped to translation keys
  private readonly countryData: CountryInfo[] = [
    { code: 'af', translationKey: 'COUNTRIES.AFGHANISTAN' },
    { code: 'al', translationKey: 'COUNTRIES.ALBANIA' },
    { code: 'dz', translationKey: 'COUNTRIES.ALGERIA' },
    { code: 'ad', translationKey: 'COUNTRIES.ANDORRA' },
    { code: 'ao', translationKey: 'COUNTRIES.ANGOLA' },
    { code: 'ar', translationKey: 'COUNTRIES.ARGENTINA' },
    { code: 'am', translationKey: 'COUNTRIES.ARMENIA' },
    { code: 'au', translationKey: 'COUNTRIES.AUSTRALIA' },
    { code: 'at', translationKey: 'COUNTRIES.AUSTRIA' },
    { code: 'az', translationKey: 'COUNTRIES.AZERBAIJAN' },
    { code: 'bd', translationKey: 'COUNTRIES.BANGLADESH' },
    { code: 'by', translationKey: 'COUNTRIES.BELARUS' },
    { code: 'be', translationKey: 'COUNTRIES.BELGIUM' },
    { code: 'ba', translationKey: 'COUNTRIES.BOSNIA_AND_HERZEGOVINA' },
    { code: 'br', translationKey: 'COUNTRIES.BRAZIL' },
    { code: 'bg', translationKey: 'COUNTRIES.BULGARIA' },
    { code: 'ca', translationKey: 'COUNTRIES.CANADA' },
    { code: 'cn', translationKey: 'COUNTRIES.CHINA' },
    { code: 'co', translationKey: 'COUNTRIES.COLOMBIA' },
    { code: 'hr', translationKey: 'COUNTRIES.CROATIA' },
    { code: 'cu', translationKey: 'COUNTRIES.CUBA' },
    { code: 'cy', translationKey: 'COUNTRIES.CYPRUS' },
    { code: 'cz', translationKey: 'COUNTRIES.CZECH_REPUBLIC' },
    { code: 'dk', translationKey: 'COUNTRIES.DENMARK' },
    { code: 'ec', translationKey: 'COUNTRIES.ECUADOR' },
    { code: 'eg', translationKey: 'COUNTRIES.EGYPT' },
    { code: 'ee', translationKey: 'COUNTRIES.ESTONIA' },
    { code: 'et', translationKey: 'COUNTRIES.ETHIOPIA' },
    { code: 'fi', translationKey: 'COUNTRIES.FINLAND' },
    { code: 'fr', translationKey: 'COUNTRIES.FRANCE' },
    { code: 'de', translationKey: 'COUNTRIES.GERMANY' },
    { code: 'gh', translationKey: 'COUNTRIES.GHANA' },
    { code: 'gr', translationKey: 'COUNTRIES.GREECE' },
    { code: 'hn', translationKey: 'COUNTRIES.HONDURAS' },
    { code: 'hu', translationKey: 'COUNTRIES.HUNGARY' },
    { code: 'is', translationKey: 'COUNTRIES.ICELAND' },
    { code: 'in', translationKey: 'COUNTRIES.INDIA' },
    { code: 'id', translationKey: 'COUNTRIES.INDONESIA' },
    { code: 'ir', translationKey: 'COUNTRIES.IRAN' },
    { code: 'iq', translationKey: 'COUNTRIES.IRAQ' },
    { code: 'ie', translationKey: 'COUNTRIES.IRELAND' },
    { code: 'il', translationKey: 'COUNTRIES.ISRAEL' },
    { code: 'it', translationKey: 'COUNTRIES.ITALY' },
    { code: 'jp', translationKey: 'COUNTRIES.JAPAN' },
    { code: 'jo', translationKey: 'COUNTRIES.JORDAN' },
    { code: 'kz', translationKey: 'COUNTRIES.KAZAKHSTAN' },
    { code: 'ke', translationKey: 'COUNTRIES.KENYA' },
    { code: 'xk', translationKey: 'COUNTRIES.KOSOVO' },
    { code: 'kw', translationKey: 'COUNTRIES.KUWAIT' },
    { code: 'lv', translationKey: 'COUNTRIES.LATVIA' },
    { code: 'lb', translationKey: 'COUNTRIES.LEBANON' },
    { code: 'lt', translationKey: 'COUNTRIES.LITHUANIA' },
    { code: 'lu', translationKey: 'COUNTRIES.LUXEMBOURG' },
    { code: 'mk', translationKey: 'COUNTRIES.NORTH_MACEDONIA' },
    { code: 'my', translationKey: 'COUNTRIES.MALAYSIA' },
    { code: 'mt', translationKey: 'COUNTRIES.MALTA' },
    { code: 'mx', translationKey: 'COUNTRIES.MEXICO' },
    { code: 'md', translationKey: 'COUNTRIES.MOLDOVA' },
    { code: 'me', translationKey: 'COUNTRIES.MONTENEGRO' },
    { code: 'ma', translationKey: 'COUNTRIES.MOROCCO' },
    { code: 'nl', translationKey: 'COUNTRIES.NETHERLANDS' },
    { code: 'nz', translationKey: 'COUNTRIES.NEW_ZEALAND' },
    { code: 'ng', translationKey: 'COUNTRIES.NIGERIA' },
    { code: 'no', translationKey: 'COUNTRIES.NORWAY' },
    { code: 'pk', translationKey: 'COUNTRIES.PAKISTAN' },
    { code: 'pe', translationKey: 'COUNTRIES.PERU' },
    { code: 'ph', translationKey: 'COUNTRIES.PHILIPPINES' },
    { code: 'pl', translationKey: 'COUNTRIES.POLAND' },
    { code: 'pt', translationKey: 'COUNTRIES.PORTUGAL' },
    { code: 'qa', translationKey: 'COUNTRIES.QATAR' },
    { code: 'ro', translationKey: 'COUNTRIES.ROMANIA' },
    { code: 'ru', translationKey: 'COUNTRIES.RUSSIA' },
    { code: 'sa', translationKey: 'COUNTRIES.SAUDI_ARABIA' },
    { code: 'rs', translationKey: 'COUNTRIES.SERBIA' },
    { code: 'sg', translationKey: 'COUNTRIES.SINGAPORE' },
    { code: 'sk', translationKey: 'COUNTRIES.SLOVAKIA' },
    { code: 'si', translationKey: 'COUNTRIES.SLOVENIA' },
    { code: 'za', translationKey: 'COUNTRIES.SOUTH_AFRICA' },
    { code: 'kr', translationKey: 'COUNTRIES.SOUTH_KOREA' },
    { code: 'es', translationKey: 'COUNTRIES.SPAIN' },
    { code: 'se', translationKey: 'COUNTRIES.SWEDEN' },
    { code: 'ch', translationKey: 'COUNTRIES.SWITZERLAND' },
    { code: 'tw', translationKey: 'COUNTRIES.TAIWAN' },
    { code: 'tz', translationKey: 'COUNTRIES.TANZANIA' },
    { code: 'th', translationKey: 'COUNTRIES.THAILAND' },
    { code: 'tn', translationKey: 'COUNTRIES.TUNISIA' },
    { code: 'tr', translationKey: 'COUNTRIES.TURKEY' },
    { code: 'ua', translationKey: 'COUNTRIES.UKRAINE' },
    { code: 'ae', translationKey: 'COUNTRIES.UAE' },
    { code: 'gb', translationKey: 'COUNTRIES.UNITED_KINGDOM' },
    { code: 'us', translationKey: 'COUNTRIES.USA' },
    { code: 'vn', translationKey: 'COUNTRIES.VIETNAM' }
  ];

  /**
   * Get all countries with their translated names for the current language
   */
  getCountries(): string[] {
    return this.countryData
      .map(c => this.languageService.translate(c.translationKey))
      .sort((a, b) => a.localeCompare(b));
  }

  /**
   * Get country info by translated name (for reverse lookup)
   */
  getCountryInfoByName(name: string): CountryInfo | undefined {
    const normalizedName = name.toLowerCase().trim();
    return this.countryData.find(c =>
      this.languageService.translate(c.translationKey).toLowerCase() === normalizedName
    );
  }

  /**
   * Get country info by code
   */
  getCountryInfoByCode(code: string): CountryInfo | undefined {
    return this.countryData.find(c => c.code.toLowerCase() === code.toLowerCase());
  }

  /**
   * Get all country data
   */
  getAllCountryData(): CountryInfo[] {
    return this.countryData;
  }
}
