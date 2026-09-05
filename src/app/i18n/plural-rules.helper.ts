/**
 * Plural forms following CLDR / Intl.PluralRules standard categories
 */
export interface PluralForms {
  one?: string;
  few?: string;
  many?: string;
  two?: string;
  zero?: string;
  other: string;
}

export interface UnitTranslations {
  over: string;
  million: PluralForms;
  thousand: PluralForms;
  year: PluralForms;
  month: PluralForms;
  day: PluralForms;
  hour: PluralForms;
  minute: PluralForms;
  /** Keywords in templates for days (used to detect and replace day-based facts) */
  dayKeywords: string[];
  /** Keywords in templates for minutes (used to detect and replace minute-based facts) */
  minuteKeywords: string[];
}

/**
 * Resolves the appropriate plural word using the browser / Node Intl.PluralRules API
 *
 * @param forms - The plural forms defined for the unit
 * @param count - The numeric count
 * @param locale - BCP 47 language tag or list of tags
 * @returns The resolved plural word
 */
export function getPluralWord(
  forms: PluralForms,
  count: number,
  locale: string | string[],
): string {
  try {
    const primaryLocale = Array.isArray(locale) ? locale[0] : locale;
    const pluralRules = new Intl.PluralRules(primaryLocale);
    const category = pluralRules.select(count);
    return forms[category] ?? forms.other;
  } catch {
    return count === 1 && forms.one ? forms.one : forms.other;
  }
}
