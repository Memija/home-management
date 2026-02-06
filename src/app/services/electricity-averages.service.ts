import { Injectable } from '@angular/core';

export interface CountryElectricityData {
  averageKwhPerPersonPerYear: number;
  source: string;
  year: number;
}

@Injectable({
  providedIn: 'root'
})
export class ElectricityAveragesService {
  // Average annual electricity consumption per person (kWh)
  // Sources: Eurostat, EIA, World Bank, national statistics agencies
  // Based on ~2-person household averages where per-person data isn't explicitly available
  private readonly countryData: Record<string, CountryElectricityData> = {
    // Europe
    'germany': { averageKwhPerPersonPerYear: 1500, source: 'BDEW', year: 2022 },
    'deutschland': { averageKwhPerPersonPerYear: 1500, source: 'BDEW', year: 2022 },
    'austria': { averageKwhPerPersonPerYear: 1600, source: 'E-Control', year: 2021 },
    'österreich': { averageKwhPerPersonPerYear: 1600, source: 'E-Control', year: 2021 },
    'switzerland': { averageKwhPerPersonPerYear: 1800, source: 'BFE', year: 2021 },
    'schweiz': { averageKwhPerPersonPerYear: 1800, source: 'BFE', year: 2021 },
    'france': { averageKwhPerPersonPerYear: 2200, source: 'RTE', year: 2021 }, // Higher due to electric heating
    'united kingdom': { averageKwhPerPersonPerYear: 1400, source: 'Gov UK', year: 2022 },
    'italy': { averageKwhPerPersonPerYear: 1200, source: 'Terna', year: 2021 },
    'spain': { averageKwhPerPersonPerYear: 1300, source: 'REE', year: 2021 },
    'netherlands': { averageKwhPerPersonPerYear: 1400, source: 'CBS', year: 2021 },
    'belgium': { averageKwhPerPersonPerYear: 1500, source: 'Synergrid', year: 2021 },
    'poland': { averageKwhPerPersonPerYear: 1100, source: 'ARE', year: 2021 },
    'sweden': { averageKwhPerPersonPerYear: 4000, source: 'SCB', year: 2021 }, // High due to heating/abundance
    'norway': { averageKwhPerPersonPerYear: 7000, source: 'SSB', year: 2021 }, // High due to heating
    'finland': { averageKwhPerPersonPerYear: 3500, source: 'Statistics Finland', year: 2021 },

    // North America
    'usa': { averageKwhPerPersonPerYear: 4500, source: 'EIA', year: 2021 }, // High per capita
    'canada': { averageKwhPerPersonPerYear: 5000, source: 'NRCan', year: 2021 },

    // Asia
    'japan': { averageKwhPerPersonPerYear: 2000, source: 'FEPC', year: 2020 },
    'china': { averageKwhPerPersonPerYear: 1500, source: 'CEC', year: 2021 },
    'india': { averageKwhPerPersonPerYear: 400, source: 'CEA', year: 2021 },

    // World average
    'world': { averageKwhPerPersonPerYear: 2700, source: 'IEA World Average', year: 2021 }
  };

  private readonly defaultData: CountryElectricityData = {
    averageKwhPerPersonPerYear: 1500,
    source: 'European Average Estimate',
    year: 2022
  };

  // Code-to-country mapping for reverse lookup
  private readonly codeToCountry: Record<string, string> = {
    'de': 'germany', 'at': 'austria', 'ch': 'switzerland', 'gb': 'united kingdom',
    'uk': 'united kingdom', 'ie': 'ireland', 'fr': 'france', 'it': 'italy',
    'es': 'spain', 'pt': 'portugal', 'pl': 'poland', 'nl': 'netherlands',
    'be': 'belgium', 'se': 'sweden', 'no': 'norway', 'fi': 'finland',
    'dk': 'denmark', 'cz': 'czech republic', 'sk': 'slovakia', 'hu': 'hungary',
    'us': 'usa', 'ca': 'canada', 'jp': 'japan', 'cn': 'china', 'in': 'india',
    'world': 'world'
  };

  // Country name to code mapping
  private readonly countryToCode: Record<string, string> = {
    'germany': 'de', 'italy': 'it', 'france': 'fr', 'united kingdom': 'gb',
    'spain': 'es', 'usa': 'us', 'austria': 'at', 'switzerland': 'ch'
    // Add more as needed
  };

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

    return this.defaultData;
  }

  getAverageKwhPerPersonPerYear(countryOrCode: string): number {
    return this.getCountryData(countryOrCode).averageKwhPerPersonPerYear;
  }
}
