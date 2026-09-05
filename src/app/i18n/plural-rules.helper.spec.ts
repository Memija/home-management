import { describe, it, expect } from 'vitest';
import { getPluralWord, PluralForms } from './plural-rules.helper';
import { UNITS_CONFIG } from './units';
import { SUPPORTED_LANGUAGES, Language } from '../services/language.service';

describe('getPluralWord (Intl.PluralRules Helper)', () => {
  const englishForms: PluralForms = {
    one: 'hour',
    other: 'hours',
  };

  const germanForms: PluralForms = {
    one: 'Stunde',
    other: 'Stunden',
  };

  const polishForms: PluralForms = {
    one: 'godzinę',
    few: 'godziny',
    many: 'godzin',
    other: 'godzin',
  };

  const bosnianForms: PluralForms = {
    one: 'sat',
    few: 'sata',
    other: 'sati',
  };

  const serbianForms: PluralForms = {
    one: 'сат',
    few: 'сата',
    other: 'сати',
  };

  const indonesianForms: PluralForms = {
    other: 'jam',
  };

  describe('Language-specific plural rules', () => {
    it('should resolve English singular and plural (en-US)', () => {
      expect(getPluralWord(englishForms, 1, 'en-US')).toBe('hour');
      expect(getPluralWord(englishForms, 2, 'en-US')).toBe('hours');
      expect(getPluralWord(englishForms, 0, 'en-US')).toBe('hours');
      expect(getPluralWord(englishForms, 10, 'en-US')).toBe('hours');
    });

    it('should resolve German singular and plural (de-DE)', () => {
      expect(getPluralWord(germanForms, 1, 'de-DE')).toBe('Stunde');
      expect(getPluralWord(germanForms, 2, 'de-DE')).toBe('Stunden');
      expect(getPluralWord(germanForms, 0, 'de-DE')).toBe('Stunden');
      expect(getPluralWord(germanForms, 5, 'de-DE')).toBe('Stunden');
    });

    it('should resolve Polish complex plural forms correctly (pl-PL)', () => {
      // 1 -> one
      expect(getPluralWord(polishForms, 1, 'pl-PL')).toBe('godzinę');
      // 2, 3, 4 -> few
      expect(getPluralWord(polishForms, 2, 'pl-PL')).toBe('godziny');
      expect(getPluralWord(polishForms, 4, 'pl-PL')).toBe('godziny');
      // 5..21 -> many
      expect(getPluralWord(polishForms, 5, 'pl-PL')).toBe('godzin');
      expect(getPluralWord(polishForms, 21, 'pl-PL')).toBe('godzin');
      // 22, 23, 24 -> few
      expect(getPluralWord(polishForms, 22, 'pl-PL')).toBe('godziny');
      expect(getPluralWord(polishForms, 24, 'pl-PL')).toBe('godziny');
      // 25 -> many
      expect(getPluralWord(polishForms, 25, 'pl-PL')).toBe('godzin');
    });

    it('should resolve Bosnian Slavic plural rules correctly (bs-Latn-BA)', () => {
      // 1 -> one
      expect(getPluralWord(bosnianForms, 1, 'bs-Latn-BA')).toBe('sat');
      // 2, 3, 4 -> few
      expect(getPluralWord(bosnianForms, 2, 'bs-Latn-BA')).toBe('sata');
      expect(getPluralWord(bosnianForms, 3, 'bs-Latn-BA')).toBe('sata');
      expect(getPluralWord(bosnianForms, 4, 'bs-Latn-BA')).toBe('sata');
      // 5..20 -> other
      expect(getPluralWord(bosnianForms, 0, 'bs-Latn-BA')).toBe('sati');
      expect(getPluralWord(bosnianForms, 5, 'bs-Latn-BA')).toBe('sati');
      expect(getPluralWord(bosnianForms, 11, 'bs-Latn-BA')).toBe('sati');
      expect(getPluralWord(bosnianForms, 20, 'bs-Latn-BA')).toBe('sati');
      // 21 -> one
      expect(getPluralWord(bosnianForms, 21, 'bs-Latn-BA')).toBe('sat');
      // 22, 24 -> few
      expect(getPluralWord(bosnianForms, 22, 'bs-Latn-BA')).toBe('sata');
      expect(getPluralWord(bosnianForms, 24, 'bs-Latn-BA')).toBe('sata');
      // 25 -> other
      expect(getPluralWord(bosnianForms, 25, 'bs-Latn-BA')).toBe('sati');
    });

    it('should resolve Serbian Cyrillic plural rules correctly (sr-RS)', () => {
      // 1 -> one
      expect(getPluralWord(serbianForms, 1, 'sr-RS')).toBe('сат');
      // 2, 3, 4 -> few
      expect(getPluralWord(serbianForms, 2, 'sr-RS')).toBe('сата');
      expect(getPluralWord(serbianForms, 3, 'sr-RS')).toBe('сата');
      expect(getPluralWord(serbianForms, 4, 'sr-RS')).toBe('сата');
      // 5..20 -> other
      expect(getPluralWord(serbianForms, 0, 'sr-RS')).toBe('сати');
      expect(getPluralWord(serbianForms, 5, 'sr-RS')).toBe('сати');
      expect(getPluralWord(serbianForms, 11, 'sr-RS')).toBe('сати');
      expect(getPluralWord(serbianForms, 20, 'sr-RS')).toBe('сати');
      // 21 -> one
      expect(getPluralWord(serbianForms, 21, 'sr-RS')).toBe('сат');
      // 22, 24 -> few
      expect(getPluralWord(serbianForms, 22, 'sr-RS')).toBe('сата');
      expect(getPluralWord(serbianForms, 24, 'sr-RS')).toBe('сата');
      // 25 -> other
      expect(getPluralWord(serbianForms, 25, 'sr-RS')).toBe('сати');
    });

    it('should handle languages without singular/plural distinction (Indonesian, id-ID)', () => {
      expect(getPluralWord(indonesianForms, 1, 'id-ID')).toBe('jam');
      expect(getPluralWord(indonesianForms, 2, 'id-ID')).toBe('jam');
      expect(getPluralWord(indonesianForms, 5, 'id-ID')).toBe('jam');
    });
  });

  describe('Fallback, edge cases, and resilience', () => {
    it('should fallback to other when category form is undefined', () => {
      // Bosnian count 2 has category 'few', but if forms only defines 'one' and 'other'
      const withoutFew: PluralForms = { one: 'sat', other: 'sati' };
      expect(getPluralWord(withoutFew, 2, 'bs-Latn-BA')).toBe('sati');

      const incompleteForms: PluralForms = { other: 'default' };
      expect(getPluralWord(incompleteForms, 1, 'en-US')).toBe('default');
    });

    it('should handle array of locales safely (e.g. Bosnian fallback list)', () => {
      const bosnianLocaleList = ['bs-Latn-BA', 'hr-HR', 'sr-Latn-RS'];
      expect(getPluralWord(bosnianForms, 1, bosnianLocaleList)).toBe('sat');
      expect(getPluralWord(bosnianForms, 2, bosnianLocaleList)).toBe('sata');
      expect(getPluralWord(bosnianForms, 5, bosnianLocaleList)).toBe('sati');

      expect(getPluralWord(englishForms, 1, ['en-US', 'en-GB'])).toBe('hour');
    });

    it('should fallback gracefully when Intl.PluralRules throws (invalid locale)', () => {
      expect(getPluralWord(englishForms, 1, 'invalid-locale')).toBe('hour');
      expect(getPluralWord(englishForms, 2, 'invalid-locale')).toBe('hours');
      expect(getPluralWord({ other: 'default' }, 1, 'invalid-locale')).toBe('default');
    });
  });

  describe('Integration with UNITS_CONFIG for all supported languages', () => {
    const localeMap: Record<Language, string | string[]> = {
      en: 'en-US',
      de: 'de-DE',
      bs: ['bs-Latn-BA', 'hr-HR', 'sr-Latn-RS'],
      sr: 'sr-RS',
      pl: 'pl-PL',
      id: 'id-ID',
    };

    it('should cover all SUPPORTED_LANGUAGES in UNITS_CONFIG', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(UNITS_CONFIG[lang], `UNITS_CONFIG missing config for ${lang}`).toBeDefined();
        const units = UNITS_CONFIG[lang];
        const locale = localeMap[lang];

        // Ensure hour and minute resolve without error for 1 and 5
        const singularHour = getPluralWord(units.hour, 1, locale);
        const pluralHour = getPluralWord(units.hour, 5, locale);
        expect(singularHour).toBeTruthy();
        expect(pluralHour).toBeTruthy();

        const singularMinute = getPluralWord(units.minute, 1, locale);
        const pluralMinute = getPluralWord(units.minute, 5, locale);
        expect(singularMinute).toBeTruthy();
        expect(pluralMinute).toBeTruthy();

        // Ensure million and thousand resolve
        expect(getPluralWord(units.million, 1, locale)).toBeTruthy();
        expect(getPluralWord(units.million, 2, locale)).toBeTruthy();
        expect(getPluralWord(units.thousand, 1, locale)).toBeTruthy();
        expect(getPluralWord(units.thousand, 5, locale)).toBeTruthy();
      }
    });
  });
});
