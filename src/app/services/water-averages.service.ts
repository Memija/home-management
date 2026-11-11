import { Injectable } from '@angular/core';
import {
  CountryWaterData,
  COUNTRY_WATER_DATA,
  DEFAULT_WATER_DATA,
  WORLD_WATER_DATA,
  AVAILABLE_WATER_COUNTRIES,
} from '../models/water-averages.data';
import { CODE_TO_COUNTRY, COUNTRY_TO_CODE } from '../models/country-codes.data';

export type { CountryWaterData } from '../models/water-averages.data';

@Injectable({
  providedIn: 'root',
})
export class WaterAveragesService {
  private readonly countryData = COUNTRY_WATER_DATA;
  private readonly defaultData = DEFAULT_WATER_DATA;
  private readonly worldData = WORLD_WATER_DATA;
  private readonly codeToCountry = CODE_TO_COUNTRY;
  private readonly countryToCode = COUNTRY_TO_CODE;

  getCountryData(countryOrCode: string): CountryWaterData {
    if (!countryOrCode) {
      return this.defaultData;
    }

    const normalized = countryOrCode.toLowerCase().trim();

    if (this.countryData[normalized]) {
      return this.countryData[normalized];
    }

    const countryName = this.codeToCountry[normalized];
    if (countryName && countryName !== 'world' && this.countryData[countryName]) {
      return this.countryData[countryName];
    }

    if (normalized === 'world') {
      return this.worldData;
    }

    return this.defaultData;
  }

  getAverageLitersPerPersonPerDay(countryOrCode: string): number {
    return this.getCountryData(countryOrCode).averageLitersPerPersonPerDay;
  }

  // Get country code from country name (supports English and German names)
  getCountryCode(countryName: string): string | null {
    if (!countryName) return null;
    const normalized = countryName.toLowerCase().trim();

    if (this.codeToCountry[normalized]) {
      return normalized;
    }

    return this.countryToCode[normalized] || null;
  }

  hasCountryData(country: string): boolean {
    if (!country) return false;
    const normalizedCountry = country.toLowerCase().trim();
    return normalizedCountry in this.countryData;
  }

  getAllCountries(): string[] {
    return Object.keys(this.countryData);
  }

  // Returns a list of unique countries with translation keys, codes, and averages for dropdown
  getAvailableCountries(): { translationKey: string; code: string; average: number }[] {
    return [...AVAILABLE_WATER_COUNTRIES];
  }

  // Get flag URL for a country code (local flags directory)
  getFlagUrl(countryCode: string): string {
    const code = countryCode.toLowerCase();
    if (code === 'world') {
      return '/flags/un.png';
    }
    return `/flags/${code}.png`;
  }
}
