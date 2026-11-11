import { Injectable } from '@angular/core';
import {
  CountryHeatingData,
  COUNTRY_HEATING_DATA,
  DEFAULT_HEATING_DATA,
} from '../models/heating-averages.data';
import { CODE_TO_COUNTRY, COUNTRY_TO_CODE } from '../models/country-codes.data';

export type { CountryHeatingData } from '../models/heating-averages.data';

/**
 * Service providing country-level average heating consumption data.
 * Used for comparison against user's recorded heating consumption.
 *
 * Climate zones used for fallback estimation:
 * - Cold: 15000-25000 kWh (Nordic, Russia, Canada)
 * - Temperate: 10000-15000 kWh (Central Europe, Northern US)
 * - Mediterranean: 5000-10000 kWh (Southern Europe, coastal areas)
 * - Subtropical: 2000-5000 kWh (Southern US, parts of Asia)
 * - Tropical/Hot: 500-2000 kWh (Africa, Southeast Asia, Middle East)
 */
@Injectable({
  providedIn: 'root',
})
export class HeatingAveragesService {
  private readonly countryData = COUNTRY_HEATING_DATA;
  private readonly defaultData = DEFAULT_HEATING_DATA;
  private readonly codeToCountry = CODE_TO_COUNTRY;
  private readonly countryToCode = COUNTRY_TO_CODE;

  getCountryData(countryOrCode: string): CountryHeatingData {
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

  getAverageKwhPerYear(countryOrCode: string): number {
    return this.getCountryData(countryOrCode).averageKwhPerYear;
  }
}
