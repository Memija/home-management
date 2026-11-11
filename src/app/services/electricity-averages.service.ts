import { Injectable } from '@angular/core';
import {
  CountryElectricityData,
  COUNTRY_ELECTRICITY_DATA,
  DEFAULT_ELECTRICITY_DATA,
} from '../models/electricity-averages.data';
import { CODE_TO_COUNTRY, COUNTRY_TO_CODE } from '../models/country-codes.data';

export type { CountryElectricityData } from '../models/electricity-averages.data';

@Injectable({
  providedIn: 'root',
})
export class ElectricityAveragesService {
  private readonly countryData = COUNTRY_ELECTRICITY_DATA;
  private readonly defaultData = DEFAULT_ELECTRICITY_DATA;
  private readonly codeToCountry = CODE_TO_COUNTRY;
  private readonly countryToCode = COUNTRY_TO_CODE;

  getCountryData(countryOrCode: string): CountryElectricityData {
    if (!countryOrCode) {
      return this.defaultData;
    }

    const normalized = countryOrCode.toLowerCase().trim();

    // First try as country name
    if (this.countryData[normalized]) {
      return this.countryData[normalized];
    }

    // Then try as country code
    const countryName = this.codeToCountry[normalized];
    if (countryName && this.countryData[countryName]) {
      return this.countryData[countryName];
    }

    // Try resolving via countryToCode then codeToCountry
    const code = this.countryToCode[normalized];
    if (code) {
      const mappedName = this.codeToCountry[code];
      if (mappedName && this.countryData[mappedName]) {
        return this.countryData[mappedName];
      }
    }

    return this.defaultData;
  }

  getAverageKwhPerPersonPerYear(countryOrCode: string): number {
    return this.getCountryData(countryOrCode).averageKwhPerPersonPerYear;
  }
}
