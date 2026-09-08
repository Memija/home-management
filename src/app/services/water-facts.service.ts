import { Injectable, inject } from '@angular/core';
import { LanguageService, Language } from './language.service';
import { en } from '../i18n/en';
import { de } from '../i18n/de';
import { bs } from '../i18n/bs';
import { sr } from '../i18n/sr';
import { pl } from '../i18n/pl';
import { id } from '../i18n/id';
import { UNITS_CONFIG } from '../i18n/units';
import { getPluralWord } from '../i18n/plural-rules.helper';

export interface WaterFact {
  title: string;
  message: string;
}

export type WaterFactContext = 'total' | 'kitchen' | 'bathroom' | 'warm' | 'cold';

type FactTranslations = typeof en | typeof de | typeof bs | typeof sr | typeof pl | typeof id;

const TRANSLATIONS: Record<Language, FactTranslations> = {
  en,
  de,
  bs,
  sr,
  pl,
  id,
};

/**
 * Conversion factors for water equivalents
 * All values in liters
 */
const WATER_EQUIVALENTS = {
  BATHTUB: 150,
  KIDDIE_POOL: 200,
  BUBBLE_BATH: 150,
  HOT_TUB: 1500,
  SHOWER_5MIN: 50,
  SHOWER_MINUTES: 10,
  GLASS_WATER: 0.25,
  DRINKING_PER_DAY: 2,
  TOILET_FLUSH: 6,
  TOILET_PER_DAY: 30,
  DISHWASHER: 15,
  HAND_WASH_DISHES: 20,
  KITCHEN_SINK: 20,
  TEA_CUP: 0.3,
  PASTA_POT: 5,
  LAUNDRY_LOAD: 50,
  HOUSEPLANT: 0.5,
  GARDEN_HOSE_MIN: 10,
  DOG_PER_DAY: 2,
  CAT_PER_DAY: 0.25,
  WATER_BALLOON: 0.5,
  WATERMELON: 10,
  KETTLE: 1.5,
  COOKING_POT: 3,
  MOP_BUCKET: 8,
  TEETH_BRUSHING: 8,
  FACE_WASH: 2,
  HAIR_WASH: 15,
  ICE_CUBE: 0.03,
  COFFEE_POT: 1.5,
  RICE_PORTION: 0.2,
  CAR_WASH: 200,
};

@Injectable({
  providedIn: 'root',
})
export class WaterFactsService {
  private languageService = inject(LanguageService);

  /**
   * Get a context-specific fact by index
   * @param liters - The water amount in liters
   * @param index - Random index to select a fact
   * @param context - The context: 'total', 'kitchen', 'bathroom', 'warm', 'cold'
   * @returns WaterFact or null if no data available for the context
   */
  getFactByIndex(
    liters: number,
    index: number,
    context: WaterFactContext = 'total',
  ): WaterFact | null {
    // Return null if no water data for this context
    if (liters <= 0) {
      return null;
    }

    const lang = this.languageService.currentLang();
    const translations = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
    const units = UNITS_CONFIG[lang] ?? UNITS_CONFIG.en;
    const locale = this.languageService.currentLocale();

    // Get the appropriate facts array based on context
    const facts = this.getFactsForContext(translations, context);

    // Use modulo to ensure we stay within bounds
    const safeIndex = Math.abs(index) % facts.length;
    const factTemplate = facts[safeIndex];

    // Calculate appropriate value
    const value = this.calculateValueForContext(liters, safeIndex, context);

    // Detect time-based facts that need conversion (days, minutes)
    // eslint-disable-next-line security/detect-non-literal-regexp -- dayKeywords is an internal constant array
    const dayPattern = new RegExp(`\\{value\\}\\s*(${units.dayKeywords.join('|')})`, 'i');
    // eslint-disable-next-line security/detect-non-literal-regexp -- minuteKeywords is an internal constant array
    const minutePattern = new RegExp(`\\{value\\}\\s*(${units.minuteKeywords.join('|')})`, 'i');
    const isDaysFact = dayPattern.test(factTemplate);
    const isMinutesFact = minutePattern.test(factTemplate);

    let message: string;

    if (isDaysFact && value > 365) {
      // Convert days to years
      const years = Math.floor(value / 365);
      const yearWord = getPluralWord(units.year, years, locale);
      const yearsFormatted = `${years.toLocaleString(locale)} ${yearWord}`;
      message = factTemplate.replace(dayPattern, yearsFormatted);
    } else if (isMinutesFact && value > 1440) {
      // Convert minutes to days (1440 minutes = 1 day)
      const days = Math.floor(value / 1440);
      let timeFormatted: string;
      if (days > 30) {
        const months = Math.floor(days / 30);
        const monthWord = getPluralWord(units.month, months, locale);
        timeFormatted = `${months.toLocaleString(locale)} ${monthWord}`;
      } else {
        const dayWord = getPluralWord(units.day, days, locale);
        timeFormatted = `${days.toLocaleString(locale)} ${dayWord}`;
      }
      message = factTemplate.replace(minutePattern, timeFormatted);
    } else if (isMinutesFact && value > 60) {
      // Convert minutes to hours
      const hours = Math.floor(value / 60);
      const hourWord = getPluralWord(units.hour, hours, locale);
      const hoursFormatted = `${hours.toLocaleString(locale)} ${hourWord}`;
      message = factTemplate.replace(minutePattern, hoursFormatted);
    } else {
      // Replace placeholder with formatted value
      message = factTemplate.replace('{value}', this.formatNumber(value, lang));
    }

    return {
      title: translations.FACTS?.DID_YOU_KNOW || 'Did you know?',
      message,
    };
  }

  private getFactsForContext(
    translations: typeof en | typeof de | typeof bs | typeof sr | typeof pl | typeof id,
    context: WaterFactContext,
  ): string[] {
    switch (context) {
      case 'kitchen':
        return translations.WATER_FACTS.KITCHEN_FACTS;
      case 'bathroom':
        return translations.WATER_FACTS.BATHROOM_FACTS;
      case 'warm':
        return translations.WATER_FACTS.WARM_FACTS;
      case 'cold':
        return translations.WATER_FACTS.COLD_FACTS;
      default:
        return translations.WATER_FACTS.FACTS;
    }
  }

  private calculateValueForContext(
    liters: number,
    factIndex: number,
    context: WaterFactContext,
  ): number {
    // Context-specific equivalents
    const contextEquivalents: Record<WaterFactContext, number[]> = {
      total: [
        WATER_EQUIVALENTS.BATHTUB,
        WATER_EQUIVALENTS.KIDDIE_POOL,
        WATER_EQUIVALENTS.BUBBLE_BATH,
        WATER_EQUIVALENTS.HOT_TUB,
        WATER_EQUIVALENTS.SHOWER_5MIN,
        WATER_EQUIVALENTS.SHOWER_5MIN,
        WATER_EQUIVALENTS.SHOWER_MINUTES,
        WATER_EQUIVALENTS.GLASS_WATER,
        WATER_EQUIVALENTS.DRINKING_PER_DAY,
        WATER_EQUIVALENTS.DRINKING_PER_DAY,
        WATER_EQUIVALENTS.TOILET_FLUSH,
        WATER_EQUIVALENTS.TOILET_PER_DAY,
        WATER_EQUIVALENTS.LAUNDRY_LOAD,
        WATER_EQUIVALENTS.HOUSEPLANT,
        WATER_EQUIVALENTS.GARDEN_HOSE_MIN,
        WATER_EQUIVALENTS.DOG_PER_DAY,
        WATER_EQUIVALENTS.CAT_PER_DAY,
        WATER_EQUIVALENTS.WATER_BALLOON,
        WATER_EQUIVALENTS.WATERMELON,
        1, // kg
        WATER_EQUIVALENTS.ICE_CUBE,
        WATER_EQUIVALENTS.KETTLE,
        WATER_EQUIVALENTS.MOP_BUCKET,
        WATER_EQUIVALENTS.TEETH_BRUSHING,
        1, // kg
      ],
      kitchen: [
        WATER_EQUIVALENTS.DISHWASHER,
        WATER_EQUIVALENTS.HAND_WASH_DISHES,
        WATER_EQUIVALENTS.KITCHEN_SINK,
        WATER_EQUIVALENTS.TEA_CUP,
        WATER_EQUIVALENTS.PASTA_POT,
        WATER_EQUIVALENTS.COOKING_POT,
        1, // liters soup
        WATER_EQUIVALENTS.PASTA_POT,
        WATER_EQUIVALENTS.COFFEE_POT,
        WATER_EQUIVALENTS.PASTA_POT,
        WATER_EQUIVALENTS.HAND_WASH_DISHES,
        WATER_EQUIVALENTS.HAND_WASH_DISHES,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.KETTLE,
        WATER_EQUIVALENTS.RICE_PORTION,
        WATER_EQUIVALENTS.COOKING_POT,
        WATER_EQUIVALENTS.ICE_CUBE,
        WATER_EQUIVALENTS.GLASS_WATER,
        WATER_EQUIVALENTS.PASTA_POT,
        0.15, // baby bottle
      ],
      bathroom: [
        WATER_EQUIVALENTS.BATHTUB,
        WATER_EQUIVALENTS.BUBBLE_BATH,
        WATER_EQUIVALENTS.SHOWER_5MIN,
        WATER_EQUIVALENTS.TOILET_FLUSH,
        WATER_EQUIVALENTS.TEETH_BRUSHING,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.HAIR_WASH,
        10, // foot bath
        2, // shaving
        WATER_EQUIVALENTS.KITCHEN_SINK,
        WATER_EQUIVALENTS.HOT_TUB,
        50, // spa session
        WATER_EQUIVALENTS.MOP_BUCKET,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.SHOWER_5MIN,
        WATER_EQUIVALENTS.KITCHEN_SINK,
        WATER_EQUIVALENTS.BATHTUB,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.FACE_WASH,
      ],
      warm: [
        WATER_EQUIVALENTS.BATHTUB,
        WATER_EQUIVALENTS.SHOWER_5MIN,
        WATER_EQUIVALENTS.BUBBLE_BATH,
        WATER_EQUIVALENTS.DISHWASHER,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.COOKING_POT,
        WATER_EQUIVALENTS.TEA_CUP,
        2, // hot water bottle
        WATER_EQUIVALENTS.FACE_WASH,
        0.15, // baby bottle
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.BATHTUB,
        50, // spa
        WATER_EQUIVALENTS.SHOWER_5MIN,
        WATER_EQUIVALENTS.SHOWER_5MIN,
        WATER_EQUIVALENTS.FACE_WASH,
        10, // foot soak
        10, // muscle relax
        2, // compress
        WATER_EQUIVALENTS.FACE_WASH,
      ],
      cold: [
        WATER_EQUIVALENTS.GLASS_WATER,
        WATER_EQUIVALENTS.GLASS_WATER,
        WATER_EQUIVALENTS.HOUSEPLANT,
        WATER_EQUIVALENTS.GLASS_WATER,
        WATER_EQUIVALENTS.TOILET_FLUSH,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.GARDEN_HOSE_MIN,
        WATER_EQUIVALENTS.HOUSEPLANT,
        WATER_EQUIVALENTS.FACE_WASH,
        WATER_EQUIVALENTS.GLASS_WATER,
        WATER_EQUIVALENTS.ICE_CUBE,
        WATER_EQUIVALENTS.CAR_WASH,
        WATER_EQUIVALENTS.MOP_BUCKET,
        WATER_EQUIVALENTS.FACE_WASH,
        10, // window
        WATER_EQUIVALENTS.DOG_PER_DAY,
        5, // bird bath
        WATER_EQUIVALENTS.LAUNDRY_LOAD,
        2, // icepack
        WATER_EQUIVALENTS.FACE_WASH,
      ],
    };

    const equivalents = contextEquivalents[context] || contextEquivalents.total;
    const divisor = equivalents[factIndex % equivalents.length] || 1;
    const value = Math.round(liters / divisor);

    return Math.max(1, value);
  }

  /**
   * Format a number for display
   * - Large numbers (100k+) become "over X thousand" or "over X million"
   */
  private formatNumber(value: number, lang: Language): string {
    const locale = this.languageService.currentLocale();
    const units = UNITS_CONFIG[lang] ?? UNITS_CONFIG.en;

    // Abbreviate large numbers with full words
    if (value >= 1000000) {
      const millions = Math.floor(value / 100000) / 10; // Round to 1 decimal
      const suffix = getPluralWord(units.million, millions, locale);
      return `${units.over} ${millions.toLocaleString(locale)} ${suffix}`;
    }

    if (value >= 100000) {
      const thousands = Math.floor(value / 1000);
      const suffix = getPluralWord(units.thousand, thousands, locale);
      return `${units.over} ${thousands.toLocaleString(locale)} ${suffix}`;
    }

    return value.toLocaleString(locale);
  }
}
