import { Injectable } from '@angular/core';

export interface CountryWaterData {
  averageLitersPerPersonPerDay: number;
  source: string;
  year: number;
}

@Injectable({
  providedIn: 'root'
})
export class WaterAveragesService {
  // Official water consumption data by country (liters per person per day)
  // Sources: Umweltbundesamt, UNICEF, Wikipedia, national statistics offices
  private readonly countryData: Record<string, CountryWaterData> = {
    // Europe
    'germany': { averageLitersPerPersonPerDay: 128, source: 'Umweltbundesamt', year: 2022 },
    'deutschland': { averageLitersPerPersonPerDay: 128, source: 'Umweltbundesamt', year: 2022 },
    'italy': { averageLitersPerPersonPerDay: 220, source: 'ISTAT', year: 2022 },
    'italia': { averageLitersPerPersonPerDay: 220, source: 'ISTAT', year: 2022 },
    'france': { averageLitersPerPersonPerDay: 150, source: 'Observatoire des services publics d\'eau', year: 2020 },
    'uk': { averageLitersPerPersonPerDay: 142, source: 'Water UK', year: 2023 },
    'united kingdom': { averageLitersPerPersonPerDay: 142, source: 'Water UK', year: 2023 },
    'great britain': { averageLitersPerPersonPerDay: 142, source: 'Water UK', year: 2023 },
    'england': { averageLitersPerPersonPerDay: 142, source: 'Water UK', year: 2023 },
    'spain': { averageLitersPerPersonPerDay: 132, source: 'INE Spain', year: 2021 },
    'españa': { averageLitersPerPersonPerDay: 132, source: 'INE Spain', year: 2021 },
    'netherlands': { averageLitersPerPersonPerDay: 119, source: 'Vewin', year: 2021 },
    'belgium': { averageLitersPerPersonPerDay: 96, source: 'AQUAWAL', year: 2020 },
    'austria': { averageLitersPerPersonPerDay: 130, source: 'Statistik Austria', year: 2021 },
    'österreich': { averageLitersPerPersonPerDay: 130, source: 'Statistik Austria', year: 2021 },
    'switzerland': { averageLitersPerPersonPerDay: 142, source: 'SVGW', year: 2021 },
    'schweiz': { averageLitersPerPersonPerDay: 142, source: 'SVGW', year: 2021 },
    'poland': { averageLitersPerPersonPerDay: 92, source: 'GUS Poland', year: 2021 },
    'portugal': { averageLitersPerPersonPerDay: 187, source: 'INE Portugal', year: 2020 },
    'greece': { averageLitersPerPersonPerDay: 177, source: 'ELSTAT', year: 2020 },
    'sweden': { averageLitersPerPersonPerDay: 140, source: 'Svenskt Vatten', year: 2021 },
    'norway': { averageLitersPerPersonPerDay: 180, source: 'SSB Norway', year: 2020 },
    'denmark': { averageLitersPerPersonPerDay: 104, source: 'DANVA', year: 2021 },
    'finland': { averageLitersPerPersonPerDay: 140, source: 'Finnish Water Utilities Association', year: 2021 },
    'ireland': { averageLitersPerPersonPerDay: 129, source: 'Irish Water', year: 2021 },
    'czech republic': { averageLitersPerPersonPerDay: 89, source: 'Czech Statistical Office', year: 2021 },
    'hungary': { averageLitersPerPersonPerDay: 100, source: 'KSH Hungary', year: 2020 },
    'romania': { averageLitersPerPersonPerDay: 120, source: 'INS Romania', year: 2020 },
    'croatia': { averageLitersPerPersonPerDay: 105, source: 'Croatian Waters', year: 2020 },
    'slovenia': { averageLitersPerPersonPerDay: 98, source: 'SURS', year: 2020 },
    'slovakia': { averageLitersPerPersonPerDay: 78, source: 'Slovak Statistical Office', year: 2020 },
    'bosnia': { averageLitersPerPersonPerDay: 80, source: 'BHAS', year: 2019 },
    'bosnia and herzegovina': { averageLitersPerPersonPerDay: 80, source: 'BHAS', year: 2019 },
    'serbia': { averageLitersPerPersonPerDay: 88, source: 'Statistical Office of Serbia', year: 2020 },
    'montenegro': { averageLitersPerPersonPerDay: 95, source: 'MONSTAT', year: 2019 },
    'north macedonia': { averageLitersPerPersonPerDay: 85, source: 'SSO Macedonia', year: 2019 },
    'albania': { averageLitersPerPersonPerDay: 90, source: 'INSTAT Albania', year: 2019 },
    'kosovo': { averageLitersPerPersonPerDay: 75, source: 'KAS Kosovo', year: 2019 },

    // Americas
    'usa': { averageLitersPerPersonPerDay: 310, source: 'USGS', year: 2015 },
    'united states': { averageLitersPerPersonPerDay: 310, source: 'USGS', year: 2015 },
    'united states of america': { averageLitersPerPersonPerDay: 310, source: 'USGS', year: 2015 },
    'canada': { averageLitersPerPersonPerDay: 274, source: 'Environment Canada', year: 2019 },
    'mexico': { averageLitersPerPersonPerDay: 366, source: 'CONAGUA', year: 2020 },
    'brasil': { averageLitersPerPersonPerDay: 154, source: 'SNIS', year: 2020 },
    'brazil': { averageLitersPerPersonPerDay: 154, source: 'SNIS', year: 2020 },
    'argentina': { averageLitersPerPersonPerDay: 180, source: 'AySA', year: 2019 },

    // Africa
    'nigeria': { averageLitersPerPersonPerDay: 35, source: 'NBS Nigeria', year: 2020 },
    'south africa': { averageLitersPerPersonPerDay: 235, source: 'DWS South Africa', year: 2020 },
    'egypt': { averageLitersPerPersonPerDay: 200, source: 'EWRA Egypt', year: 2019 },
    'kenya': { averageLitersPerPersonPerDay: 50, source: 'WASREB Kenya', year: 2020 },
    'morocco': { averageLitersPerPersonPerDay: 85, source: 'ONEE Morocco', year: 2020 },
    'algeria': { averageLitersPerPersonPerDay: 180, source: 'ADE Algeria', year: 2019 },
    'tunisia': { averageLitersPerPersonPerDay: 115, source: 'SONEDE Tunisia', year: 2020 },
    'ethiopia': { averageLitersPerPersonPerDay: 20, source: 'Ministry of Water Ethiopia', year: 2019 },
    'ghana': { averageLitersPerPersonPerDay: 45, source: 'GWCL Ghana', year: 2020 },
    'tanzania': { averageLitersPerPersonPerDay: 40, source: 'DAWASA Tanzania', year: 2019 },

    // Asia
    'japan': { averageLitersPerPersonPerDay: 219, source: 'MHLW Japan', year: 2021 },
    'china': { averageLitersPerPersonPerDay: 176, source: 'MWR China', year: 2020 },
    'india': { averageLitersPerPersonPerDay: 135, source: 'CPHEEO India', year: 2020 },
    'south korea': { averageLitersPerPersonPerDay: 295, source: 'K-water', year: 2021 },
    'singapore': { averageLitersPerPersonPerDay: 141, source: 'PUB Singapore', year: 2022 },
    'malaysia': { averageLitersPerPersonPerDay: 210, source: 'SPAN Malaysia', year: 2020 },
    'indonesia': { averageLitersPerPersonPerDay: 144, source: 'PDAM Indonesia', year: 2019 },
    'thailand': { averageLitersPerPersonPerDay: 197, source: 'PWA Thailand', year: 2020 },
    'vietnam': { averageLitersPerPersonPerDay: 130, source: 'VWSA Vietnam', year: 2019 },
    'philippines': { averageLitersPerPersonPerDay: 175, source: 'MWSS Philippines', year: 2020 },
    'turkey': { averageLitersPerPersonPerDay: 188, source: 'TurkStat', year: 2020 },
    'türkiye': { averageLitersPerPersonPerDay: 188, source: 'TurkStat', year: 2020 },
    'iran': { averageLitersPerPersonPerDay: 250, source: 'Ministry of Energy Iran', year: 2019 },
    'saudi arabia': { averageLitersPerPersonPerDay: 265, source: 'NWC Saudi Arabia', year: 2020 },
    'uae': { averageLitersPerPersonPerDay: 550, source: 'FEA UAE', year: 2020 },
    'united arab emirates': { averageLitersPerPersonPerDay: 550, source: 'FEA UAE', year: 2020 },
    'israel': { averageLitersPerPersonPerDay: 137, source: 'Mekorot Israel', year: 2021 },
    'pakistan': { averageLitersPerPersonPerDay: 95, source: 'PCRWR Pakistan', year: 2019 },
    'bangladesh': { averageLitersPerPersonPerDay: 95, source: 'DPHE Bangladesh', year: 2019 },

    // Oceania
    'australia': { averageLitersPerPersonPerDay: 340, source: 'Bureau of Meteorology Australia', year: 2021 },
    'new zealand': { averageLitersPerPersonPerDay: 227, source: 'Water New Zealand', year: 2020 }
  };

  // Default fallback for unknown countries (world average estimate)
  private readonly defaultData: CountryWaterData = {
    averageLitersPerPersonPerDay: 150,
    source: 'World Average Estimate',
    year: 2022
  };

  // Code-to-country mapping for reverse lookup
  private readonly codeToCountry: Record<string, string> = {
    'de': 'germany', 'it': 'italy', 'fr': 'france', 'gb': 'united kingdom',
    'es': 'spain', 'nl': 'netherlands', 'be': 'belgium', 'at': 'austria',
    'ch': 'switzerland', 'pl': 'poland', 'pt': 'portugal', 'gr': 'greece',
    'se': 'sweden', 'no': 'norway', 'dk': 'denmark', 'fi': 'finland',
    'ie': 'ireland', 'cz': 'czech republic', 'hu': 'hungary', 'ro': 'romania',
    'hr': 'croatia', 'si': 'slovenia', 'sk': 'slovakia', 'ba': 'bosnia and herzegovina',
    'rs': 'serbia', 'me': 'montenegro', 'mk': 'north macedonia', 'al': 'albania',
    'xk': 'kosovo', 'us': 'usa', 'ca': 'canada', 'mx': 'mexico',
    'br': 'brazil', 'ar': 'argentina', 'ng': 'nigeria', 'za': 'south africa',
    'eg': 'egypt', 'ke': 'kenya', 'ma': 'morocco', 'dz': 'algeria',
    'tn': 'tunisia', 'et': 'ethiopia', 'gh': 'ghana', 'tz': 'tanzania',
    'jp': 'japan', 'cn': 'china', 'in': 'india', 'kr': 'south korea',
    'sg': 'singapore', 'my': 'malaysia', 'id': 'indonesia', 'th': 'thailand',
    'vn': 'vietnam', 'ph': 'philippines', 'tr': 'turkey', 'ir': 'iran',
    'sa': 'saudi arabia', 'ae': 'uae', 'il': 'israel', 'pk': 'pakistan',
    'bd': 'bangladesh', 'au': 'australia', 'nz': 'new zealand'
  };

  // Country name to code mapping (includes English and German names)
  private readonly countryToCode: Record<string, string> = {
    // English names
    'germany': 'de', 'italy': 'it', 'france': 'fr', 'united kingdom': 'gb',
    'spain': 'es', 'netherlands': 'nl', 'belgium': 'be', 'austria': 'at',
    'switzerland': 'ch', 'poland': 'pl', 'portugal': 'pt', 'greece': 'gr',
    'sweden': 'se', 'norway': 'no', 'denmark': 'dk', 'finland': 'fi',
    'ireland': 'ie', 'czech republic': 'cz', 'hungary': 'hu', 'romania': 'ro',
    'croatia': 'hr', 'slovenia': 'si', 'slovakia': 'sk', 'bosnia and herzegovina': 'ba',
    'serbia': 'rs', 'montenegro': 'me', 'north macedonia': 'mk', 'albania': 'al',
    'kosovo': 'xk', 'usa': 'us', 'canada': 'ca', 'mexico': 'mx',
    'brazil': 'br', 'argentina': 'ar', 'nigeria': 'ng', 'south africa': 'za',
    'egypt': 'eg', 'kenya': 'ke', 'morocco': 'ma', 'algeria': 'dz',
    'tunisia': 'tn', 'ethiopia': 'et', 'ghana': 'gh', 'tanzania': 'tz',
    'japan': 'jp', 'china': 'cn', 'india': 'in', 'south korea': 'kr',
    'singapore': 'sg', 'malaysia': 'my', 'indonesia': 'id', 'thailand': 'th',
    'vietnam': 'vn', 'philippines': 'ph', 'turkey': 'tr', 'iran': 'ir',
    'saudi arabia': 'sa', 'uae': 'ae', 'israel': 'il', 'pakistan': 'pk',
    'bangladesh': 'bd', 'australia': 'au', 'new zealand': 'nz',
    // German names
    'deutschland': 'de', 'italien': 'it', 'frankreich': 'fr', 'vereinigtes königreich': 'gb',
    'spanien': 'es', 'niederlande': 'nl', 'belgien': 'be', 'österreich': 'at',
    'schweiz': 'ch', 'polen': 'pl', 'griechenland': 'gr',
    'schweden': 'se', 'norwegen': 'no', 'dänemark': 'dk', 'finnland': 'fi',
    'irland': 'ie', 'tschechische republik': 'cz', 'tschechien': 'cz', 'ungarn': 'hu', 'rumänien': 'ro',
    'kroatien': 'hr', 'slowenien': 'si', 'slowakei': 'sk', 'bosnien und herzegowina': 'ba',
    'serbien': 'rs', 'nordmazedonien': 'mk', 'albanien': 'al',
    'kanada': 'ca', 'mexiko': 'mx', 'brasilien': 'br', 'argentinien': 'ar',
    'südafrika': 'za', 'ägypten': 'eg', 'kenia': 'ke', 'marokko': 'ma',
    'algerien': 'dz', 'tunesien': 'tn', 'äthiopien': 'et', 'tansania': 'tz',
    'indien': 'in', 'südkorea': 'kr', 'singapur': 'sg', 'indonesien': 'id',
    'philippinen': 'ph', 'türkei': 'tr', 'saudi-arabien': 'sa', 'vae': 'ae',
    'bangladesch': 'bd', 'australien': 'au', 'neuseeland': 'nz'
  };

  getCountryData(countryOrCode: string): CountryWaterData {
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

  getAverageLitersPerPersonPerDay(countryOrCode: string): number {
    return this.getCountryData(countryOrCode).averageLitersPerPersonPerDay;
  }

  // Get country code from country name (supports English and German names)
  getCountryCode(countryName: string): string | null {
    if (!countryName) return null;
    const normalized = countryName.toLowerCase().trim();

    // Check if it's already a code
    if (this.codeToCountry[normalized]) {
      return normalized;
    }

    // Look up by name
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
    return [
      { translationKey: 'COUNTRIES.GERMANY', code: 'de', average: 128 },
      { translationKey: 'COUNTRIES.ITALY', code: 'it', average: 220 },
      { translationKey: 'COUNTRIES.FRANCE', code: 'fr', average: 150 },
      { translationKey: 'COUNTRIES.UNITED_KINGDOM', code: 'gb', average: 142 },
      { translationKey: 'COUNTRIES.SPAIN', code: 'es', average: 132 },
      { translationKey: 'COUNTRIES.NETHERLANDS', code: 'nl', average: 119 },
      { translationKey: 'COUNTRIES.BELGIUM', code: 'be', average: 96 },
      { translationKey: 'COUNTRIES.AUSTRIA', code: 'at', average: 130 },
      { translationKey: 'COUNTRIES.SWITZERLAND', code: 'ch', average: 142 },
      { translationKey: 'COUNTRIES.POLAND', code: 'pl', average: 92 },
      { translationKey: 'COUNTRIES.PORTUGAL', code: 'pt', average: 187 },
      { translationKey: 'COUNTRIES.GREECE', code: 'gr', average: 177 },
      { translationKey: 'COUNTRIES.SWEDEN', code: 'se', average: 140 },
      { translationKey: 'COUNTRIES.NORWAY', code: 'no', average: 180 },
      { translationKey: 'COUNTRIES.DENMARK', code: 'dk', average: 104 },
      { translationKey: 'COUNTRIES.FINLAND', code: 'fi', average: 140 },
      { translationKey: 'COUNTRIES.IRELAND', code: 'ie', average: 129 },
      { translationKey: 'COUNTRIES.CZECH_REPUBLIC', code: 'cz', average: 89 },
      { translationKey: 'COUNTRIES.HUNGARY', code: 'hu', average: 100 },
      { translationKey: 'COUNTRIES.ROMANIA', code: 'ro', average: 120 },
      { translationKey: 'COUNTRIES.CROATIA', code: 'hr', average: 105 },
      { translationKey: 'COUNTRIES.SLOVENIA', code: 'si', average: 98 },
      { translationKey: 'COUNTRIES.SLOVAKIA', code: 'sk', average: 78 },
      { translationKey: 'COUNTRIES.BOSNIA_AND_HERZEGOVINA', code: 'ba', average: 80 },
      { translationKey: 'COUNTRIES.SERBIA', code: 'rs', average: 88 },
      { translationKey: 'COUNTRIES.MONTENEGRO', code: 'me', average: 95 },
      { translationKey: 'COUNTRIES.NORTH_MACEDONIA', code: 'mk', average: 85 },
      { translationKey: 'COUNTRIES.ALBANIA', code: 'al', average: 90 },
      { translationKey: 'COUNTRIES.KOSOVO', code: 'xk', average: 75 },
      { translationKey: 'COUNTRIES.USA', code: 'us', average: 310 },
      { translationKey: 'COUNTRIES.CANADA', code: 'ca', average: 274 },
      { translationKey: 'COUNTRIES.MEXICO', code: 'mx', average: 366 },
      { translationKey: 'COUNTRIES.BRAZIL', code: 'br', average: 154 },
      { translationKey: 'COUNTRIES.ARGENTINA', code: 'ar', average: 180 },
      { translationKey: 'COUNTRIES.NIGERIA', code: 'ng', average: 35 },
      { translationKey: 'COUNTRIES.SOUTH_AFRICA', code: 'za', average: 235 },
      { translationKey: 'COUNTRIES.EGYPT', code: 'eg', average: 200 },
      { translationKey: 'COUNTRIES.KENYA', code: 'ke', average: 50 },
      { translationKey: 'COUNTRIES.MOROCCO', code: 'ma', average: 85 },
      { translationKey: 'COUNTRIES.ALGERIA', code: 'dz', average: 180 },
      { translationKey: 'COUNTRIES.TUNISIA', code: 'tn', average: 115 },
      { translationKey: 'COUNTRIES.ETHIOPIA', code: 'et', average: 20 },
      { translationKey: 'COUNTRIES.GHANA', code: 'gh', average: 45 },
      { translationKey: 'COUNTRIES.TANZANIA', code: 'tz', average: 40 },
      { translationKey: 'COUNTRIES.JAPAN', code: 'jp', average: 219 },
      { translationKey: 'COUNTRIES.CHINA', code: 'cn', average: 176 },
      { translationKey: 'COUNTRIES.INDIA', code: 'in', average: 135 },
      { translationKey: 'COUNTRIES.SOUTH_KOREA', code: 'kr', average: 295 },
      { translationKey: 'COUNTRIES.SINGAPORE', code: 'sg', average: 141 },
      { translationKey: 'COUNTRIES.MALAYSIA', code: 'my', average: 210 },
      { translationKey: 'COUNTRIES.INDONESIA', code: 'id', average: 144 },
      { translationKey: 'COUNTRIES.THAILAND', code: 'th', average: 197 },
      { translationKey: 'COUNTRIES.VIETNAM', code: 'vn', average: 130 },
      { translationKey: 'COUNTRIES.PHILIPPINES', code: 'ph', average: 175 },
      { translationKey: 'COUNTRIES.TURKEY', code: 'tr', average: 188 },
      { translationKey: 'COUNTRIES.IRAN', code: 'ir', average: 250 },
      { translationKey: 'COUNTRIES.SAUDI_ARABIA', code: 'sa', average: 265 },
      { translationKey: 'COUNTRIES.UAE', code: 'ae', average: 550 },
      { translationKey: 'COUNTRIES.ISRAEL', code: 'il', average: 137 },
      { translationKey: 'COUNTRIES.PAKISTAN', code: 'pk', average: 95 },
      { translationKey: 'COUNTRIES.BANGLADESH', code: 'bd', average: 95 },
      { translationKey: 'COUNTRIES.AUSTRALIA', code: 'au', average: 340 },
      { translationKey: 'COUNTRIES.NEW_ZEALAND', code: 'nz', average: 227 }
    ];
  }

  // Get flag URL for a country code (local flags directory)
  getFlagUrl(countryCode: string): string {
    return `/flags/${countryCode.toLowerCase()}.png`;
  }
}
