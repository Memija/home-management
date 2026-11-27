import { Language } from '../services/language.service';

/**
 * Pages that carry their own SEO metadata.
 * Each value maps to the `SEO.<PAGE>.TITLE` and `SEO.<PAGE>.DESCRIPTION` translation keys.
 */
export type SeoPage =
  | 'HOME'
  | 'DASHBOARD'
  | 'WATER'
  | 'HEATING'
  | 'ELECTRICITY'
  | 'BENCHMARKS'
  | 'SETTINGS'
  | 'PRIVACY'
  | 'CHANGELOG'
  | 'RELEASE_PLAN'
  | 'NOT_FOUND';

/** Non-default languages that have dedicated prerendered landing page URLs (`/de`, `/bs`, ...) */
export const LOCALIZED_LANDING_LANGUAGES: readonly Language[] = [
  'de',
  'bs',
  'sr',
  'id',
  'pl',
] as const;

/** Maps each supported language to its canonical landing page path */
export const LANDING_LANGUAGE_PATHS: Readonly<Record<Language, string>> = {
  en: '/',
  de: '/de',
  bs: '/bs',
  sr: '/sr',
  id: '/id',
  pl: '/pl',
};

/** Open Graph locale codes for each supported language */
export const OG_LOCALES: Readonly<Record<Language, string>> = {
  en: 'en_US',
  de: 'de_DE',
  bs: 'bs_BA',
  sr: 'sr_RS',
  id: 'id_ID',
  pl: 'pl_PL',
};

/** Robots directive for pages that must stay out of search indexes but whose links may be followed */
export const SEO_ROBOTS_NOINDEX = 'noindex, follow';

/** SEO configuration attached to a route via `data: { seo: ... }` */
export interface SeoRouteData {
  /** Page whose translated title and description should be applied */
  readonly page: SeoPage;
  /** When true, the translated title is used as-is instead of being suffixed with the site name */
  readonly standaloneTitle?: boolean;
  /** Optional robots directive (e.g. `SEO_ROBOTS_NOINDEX`). Omit for indexable pages. */
  readonly robots?: string;
  /** Optional language pinned by a localized route (e.g. `/de`) */
  readonly lang?: Language;
}

/** Route data key under which `SeoRouteData` is stored */
export const SEO_ROUTE_DATA_KEY = 'seo';

export interface LandingFaqItem {
  readonly questionKey: string;
  readonly answerKey: string;
}

/** Shared FAQ translation keys rendered on the landing page and emitted as FAQPage JSON-LD */
export const FAQ_KEYS: readonly LandingFaqItem[] = [
  { questionKey: 'LANDING.FAQ.Q1', answerKey: 'LANDING.FAQ.A1' },
  { questionKey: 'LANDING.FAQ.Q2', answerKey: 'LANDING.FAQ.A2' },
  { questionKey: 'LANDING.FAQ.Q3', answerKey: 'LANDING.FAQ.A3' },
  { questionKey: 'LANDING.FAQ.Q4', answerKey: 'LANDING.FAQ.A4' },
  { questionKey: 'LANDING.FAQ.Q5', answerKey: 'LANDING.FAQ.A5' },
] as const;
