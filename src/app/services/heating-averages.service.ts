import { Injectable } from '@angular/core';

export interface CountryHeatingData {
  averageKwhPerYear: number;
  source: string;
  year: number;
}

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
  providedIn: 'root'
})
export class HeatingAveragesService {
  // Average annual heating consumption per household (kWh)
  // Sources: Odyssey-Mure, Eurostat, IEA, national energy agencies
  // Assumes average apartment/house size ~100m² for rough comparison
  private readonly countryData: Record<string, CountryHeatingData> = {
    // ========== COLD CLIMATE (15000-25000 kWh) ==========
    // Nordic & Northern Europe
    'finland': { averageKwhPerYear: 18000, source: 'Statistics Finland', year: 2021 },
    'norway': { averageKwhPerYear: 16000, source: 'SSB', year: 2020 },
    'sweden': { averageKwhPerYear: 14000, source: 'Energimyndigheten', year: 2020 },
    'iceland': { averageKwhPerYear: 20000, source: 'Orkustofnun', year: 2020 },
    'russia': { averageKwhPerYear: 22000, source: 'Rosstat estimate', year: 2020 },
    'estonia': { averageKwhPerYear: 16500, source: 'Statistics Estonia', year: 2020 },
    'latvia': { averageKwhPerYear: 15500, source: 'CSB Latvia', year: 2020 },
    'lithuania': { averageKwhPerYear: 15000, source: 'Statistics Lithuania', year: 2020 },

    // North America - Cold
    'canada': { averageKwhPerYear: 22000, source: 'NRCan', year: 2019 },
    'alaska': { averageKwhPerYear: 25000, source: 'EIA estimate', year: 2020 },

    // ========== TEMPERATE CLIMATE (10000-15000 kWh) ==========
    // Central & Western Europe
    'germany': { averageKwhPerYear: 13500, source: 'BDEW', year: 2021 },
    'austria': { averageKwhPerYear: 12800, source: 'Statistik Austria', year: 2020 },
    'switzerland': { averageKwhPerYear: 11500, source: 'BFE', year: 2021 },
    'united kingdom': { averageKwhPerYear: 12000, source: 'OFGEM', year: 2020 },
    'ireland': { averageKwhPerYear: 11500, source: 'SEAI', year: 2020 },
    'france': { averageKwhPerYear: 11500, source: 'ADEME', year: 2019 },
    'belgium': { averageKwhPerYear: 14000, source: 'Statbel', year: 2020 },
    'netherlands': { averageKwhPerYear: 12500, source: 'CBS', year: 2020 },
    'luxembourg': { averageKwhPerYear: 13000, source: 'STATEC', year: 2020 },
    'poland': { averageKwhPerYear: 15600, source: 'GUS', year: 2019 },
    'czech republic': { averageKwhPerYear: 14500, source: 'ERU', year: 2020 },
    'czechia': { averageKwhPerYear: 14500, source: 'ERU', year: 2020 },
    'slovakia': { averageKwhPerYear: 13500, source: 'SEPS', year: 2020 },
    'hungary': { averageKwhPerYear: 12000, source: 'KSH', year: 2020 },
    'denmark': { averageKwhPerYear: 10500, source: 'DEA', year: 2021 },

    // North America - Temperate
    'usa': { averageKwhPerYear: 14000, source: 'EIA', year: 2020 },

    // Asia - Temperate
    'japan': { averageKwhPerYear: 8000, source: 'METI', year: 2020 },
    'south korea': { averageKwhPerYear: 9500, source: 'KEEI', year: 2020 },
    'china': { averageKwhPerYear: 7500, source: 'NBS estimate', year: 2020 },

    // ========== MEDITERRANEAN CLIMATE (5000-10000 kWh) ==========
    'italy': { averageKwhPerYear: 10000, source: 'ENEA', year: 2019 },
    'spain': { averageKwhPerYear: 8500, source: 'IDAE', year: 2020 },
    'portugal': { averageKwhPerYear: 6500, source: 'DGEG', year: 2020 },
    'greece': { averageKwhPerYear: 8000, source: 'HELAPCO', year: 2020 },
    'croatia': { averageKwhPerYear: 9000, source: 'DZS', year: 2020 },
    'slovenia': { averageKwhPerYear: 10500, source: 'SURS', year: 2020 },
    'turkey': { averageKwhPerYear: 7000, source: 'TUIK', year: 2020 },
    'israel': { averageKwhPerYear: 4500, source: 'CBS Israel', year: 2020 },
    'cyprus': { averageKwhPerYear: 4000, source: 'Eurostat', year: 2020 },
    'malta': { averageKwhPerYear: 3000, source: 'NSO Malta', year: 2020 },

    // Oceania
    'australia': { averageKwhPerYear: 5000, source: 'ABS', year: 2020 },
    'new zealand': { averageKwhPerYear: 7500, source: 'Stats NZ', year: 2020 },

    // ========== SUBTROPICAL CLIMATE (2000-5000 kWh) ==========
    'argentina': { averageKwhPerYear: 4500, source: 'INDEC estimate', year: 2020 },
    'chile': { averageKwhPerYear: 5500, source: 'CNE', year: 2020 },
    'south africa': { averageKwhPerYear: 3500, source: 'Stats SA', year: 2020 },
    'mexico': { averageKwhPerYear: 2500, source: 'INEGI', year: 2020 },
    'brazil': { averageKwhPerYear: 1500, source: 'IBGE estimate', year: 2020 },

    // ========== TROPICAL/HOT CLIMATE (500-2000 kWh) ==========
    // These countries have minimal to no heating needs
    'india': { averageKwhPerYear: 1000, source: 'MOSPI estimate', year: 2020 },
    'thailand': { averageKwhPerYear: 500, source: 'NSO Thailand estimate', year: 2020 },
    'vietnam': { averageKwhPerYear: 600, source: 'GSO estimate', year: 2020 },
    'indonesia': { averageKwhPerYear: 300, source: 'BPS estimate', year: 2020 },
    'philippines': { averageKwhPerYear: 300, source: 'PSA estimate', year: 2020 },
    'malaysia': { averageKwhPerYear: 400, source: 'DOSM estimate', year: 2020 },
    'singapore': { averageKwhPerYear: 200, source: 'SingStat estimate', year: 2020 },
    'egypt': { averageKwhPerYear: 800, source: 'CAPMAS estimate', year: 2020 },
    'saudi arabia': { averageKwhPerYear: 500, source: 'GASTAT estimate', year: 2020 },
    'uae': { averageKwhPerYear: 400, source: 'FCSA estimate', year: 2020 },
    'qatar': { averageKwhPerYear: 300, source: 'PSA Qatar estimate', year: 2020 },
    'nigeria': { averageKwhPerYear: 200, source: 'NBS Nigeria estimate', year: 2020 },
    'kenya': { averageKwhPerYear: 300, source: 'KNBS estimate', year: 2020 },
    'ethiopia': { averageKwhPerYear: 400, source: 'CSA Ethiopia estimate', year: 2020 },
    'morocco': { averageKwhPerYear: 2500, source: 'HCP estimate', year: 2020 },
    'tunisia': { averageKwhPerYear: 2000, source: 'INS estimate', year: 2020 },
    'algeria': { averageKwhPerYear: 2200, source: 'ONS estimate', year: 2020 },
    'colombia': { averageKwhPerYear: 800, source: 'DANE estimate', year: 2020 },
    'peru': { averageKwhPerYear: 1000, source: 'INEI estimate', year: 2020 },
    'venezuela': { averageKwhPerYear: 500, source: 'INE estimate', year: 2020 },
  };

  // Default fallback for unknown countries - temperate climate estimate
  private readonly defaultData: CountryHeatingData = {
    averageKwhPerYear: 10000,
    source: 'Temperate climate estimate',
    year: 2022
  };

  // Code-to-country mapping for reverse lookup
  private readonly codeToCountry: Record<string, string> = {
    // Europe
    'de': 'germany', 'at': 'austria', 'ch': 'switzerland', 'gb': 'united kingdom',
    'uk': 'united kingdom', 'ie': 'ireland', 'fr': 'france', 'it': 'italy',
    'es': 'spain', 'pt': 'portugal', 'pl': 'poland', 'nl': 'netherlands',
    'be': 'belgium', 'lu': 'luxembourg', 'se': 'sweden', 'no': 'norway',
    'dk': 'denmark', 'fi': 'finland', 'is': 'iceland', 'ee': 'estonia',
    'lv': 'latvia', 'lt': 'lithuania', 'cz': 'czech republic', 'sk': 'slovakia',
    'hu': 'hungary', 'gr': 'greece', 'hr': 'croatia', 'si': 'slovenia',
    'cy': 'cyprus', 'mt': 'malta', 'ru': 'russia', 'tr': 'turkey',

    // Americas
    'us': 'usa', 'ca': 'canada', 'mx': 'mexico', 'br': 'brazil',
    'ar': 'argentina', 'cl': 'chile', 'co': 'colombia', 'pe': 'peru', 've': 'venezuela',

    // Asia & Middle East
    'jp': 'japan', 'kr': 'south korea', 'cn': 'china', 'in': 'india',
    'th': 'thailand', 'vn': 'vietnam', 'id': 'indonesia', 'ph': 'philippines',
    'my': 'malaysia', 'sg': 'singapore', 'il': 'israel', 'sa': 'saudi arabia',
    'ae': 'uae', 'qa': 'qatar', 'eg': 'egypt',

    // Africa
    'za': 'south africa', 'ng': 'nigeria', 'ke': 'kenya', 'et': 'ethiopia',
    'ma': 'morocco', 'tn': 'tunisia', 'dz': 'algeria',

    // Oceania
    'au': 'australia', 'nz': 'new zealand',
  };

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

    return this.defaultData;
  }

  getAverageKwhPerYear(countryOrCode: string): number {
    return this.getCountryData(countryOrCode).averageKwhPerYear;
  }
}
