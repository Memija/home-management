import { describe, expect, it } from 'vitest';
import {
  FAQ_KEYS,
  LANDING_LANGUAGE_PATHS,
  LOCALIZED_LANDING_LANGUAGES,
  OG_LOCALES,
  SEO_ROBOTS_NOINDEX,
  SEO_ROUTE_DATA_KEY,
} from './seo.model';

describe('seo.model', () => {
  it('should map default English to root and every localized landing language to its prefixed path', () => {
    expect(LANDING_LANGUAGE_PATHS.en).toBe('/');
    expect(LOCALIZED_LANDING_LANGUAGES).not.toContain('en');

    for (const lang of LOCALIZED_LANDING_LANGUAGES) {
      expect(LANDING_LANGUAGE_PATHS[lang]).toBe(`/${lang}`);
    }
  });

  it('should provide standard Open Graph locale codes for all supported languages', () => {
    for (const [lang, locale] of Object.entries(OG_LOCALES)) {
      expect(locale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
      expect(locale.startsWith(`${lang}_`)).toBe(true);
    }
  });

  it('should define non-empty SEO route constants and paired FAQ translation keys', () => {
    expect(SEO_ROBOTS_NOINDEX).toBe('noindex, follow');
    expect(SEO_ROUTE_DATA_KEY).toBe('seo');
    expect(FAQ_KEYS.length).toBeGreaterThan(0);

    FAQ_KEYS.forEach((faq, index) => {
      expect(faq.questionKey).toBe(`LANDING.FAQ.Q${index + 1}`);
      expect(faq.answerKey).toBe(`LANDING.FAQ.A${index + 1}`);
    });
  });
});
