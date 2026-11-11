import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SeoService } from './seo.service';
import { LanguageService } from './language.service';
import { SEO_ROBOTS_NOINDEX, SeoRouteData } from '../models/seo.model';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'SEO.HOME.TITLE': 'Home Management – Utility Tracker',
    'SEO.HOME.DESCRIPTION': 'Track water, heating and electricity.',
    'SEO.PRIVACY.TITLE': 'Privacy Policy',
    'SEO.PRIVACY.DESCRIPTION': 'How your data is handled.',
    'SEO.BENCHMARKS.TITLE': 'Country Utility Consumption Benchmarks',
    'SEO.BENCHMARKS.DESCRIPTION': 'Compare household consumption across countries.',
    'SEO.NOT_FOUND.TITLE': 'Page Not Found',
    'SEO.NOT_FOUND.DESCRIPTION': 'This page does not exist.',
    'LANDING.FAQ.Q1': 'Does it require an account?',
    'LANDING.FAQ.A1': 'No account is required.',
  },
  de: {
    'SEO.HOME.TITLE': 'Home Management – Verbrauchstracker',
    'SEO.HOME.DESCRIPTION': 'Wasserverbrauch, Heizungsverbrauch und Stromverbrauch erfassen.',
    'SEO.PRIVACY.TITLE': 'Datenschutzerklärung',
    'SEO.PRIVACY.DESCRIPTION': 'Wie Ihre Daten verarbeitet werden.',
  },
};

const seo = (data: SeoRouteData) => ({ seo: data });

describe('SeoService', () => {
  let router: Router;
  let document: Document;
  let title: Title;
  let currentLang: WritableSignal<string>;
  let setLanguageSpy: ReturnType<typeof vi.fn>;

  const getMeta = (selector: string): string | null =>
    document.head.querySelector(`meta[${selector}]`)?.getAttribute('content') ?? null;
  const getCanonical = (): string | null =>
    document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  const getAlternates = (): { hreflang: string | null; href: string | null }[] =>
    Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).map((el) => ({
      hreflang: el.getAttribute('hreflang'),
      href: el.getAttribute('href'),
    }));
  const getRouteJsonLd = (): Record<string, unknown> | null => {
    const text = document.getElementById('seo-route-jsonld')?.textContent;
    return text ? (JSON.parse(text) as Record<string, unknown>) : null;
  };

  const navigate = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    TestBed.tick();
  };

  beforeEach(() => {
    currentLang = signal('en');
    setLanguageSpy = vi.fn(async (lang: string) => {
      currentLang.set(lang);
    });
    const languageServiceMock = {
      currentLang,
      setLanguage: setLanguageSpy,
      translate: vi.fn((key: string) => TRANSLATIONS[currentLang()]?.[key] ?? key),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LanguageService, useValue: languageServiceMock },
        provideRouter([
          { path: '', children: [], data: seo({ page: 'HOME', standaloneTitle: true }) },
          {
            path: 'de',
            children: [],
            data: seo({ page: 'HOME', standaloneTitle: true, lang: 'de' }),
          },
          {
            path: 'dashboard',
            children: [
              { path: 'privacy', children: [], data: seo({ page: 'PRIVACY' }) },
              { path: 'benchmarks', children: [], data: seo({ page: 'BENCHMARKS' }) },
            ],
          },
          { path: 'untranslated', children: [], data: seo({ page: 'WATER' }) },
          { path: 'no-seo', children: [] },
          {
            path: '**',
            children: [],
            data: seo({ page: 'NOT_FOUND', robots: SEO_ROBOTS_NOINDEX }),
          },
        ]),
      ],
    });

    router = TestBed.inject(Router);
    document = TestBed.inject(DOCUMENT);
    title = TestBed.inject(Title);
    title.setTitle('Default Title');
    TestBed.inject(SeoService);
  });

  afterEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], link[rel="alternate"], #seo-route-jsonld')
      .forEach((el) => el.remove());
  });

  describe('Title', () => {
    it('should append the site name when page title is not standalone', async () => {
      await navigate('/dashboard/privacy');
      expect(title.getTitle()).toBe('Privacy Policy | Home Management');
    });

    it('should use the translated title as-is when standaloneTitle is set', async () => {
      await navigate('/');
      expect(title.getTitle()).toBe('Home Management – Utility Tracker');
    });

    it('should keep the default title when translations are missing', async () => {
      await navigate('/untranslated');
      expect(title.getTitle()).toBe('Default Title');
    });

    it('should keep the previous metadata when the route has no SEO data', async () => {
      await navigate('/dashboard/privacy');
      await navigate('/no-seo');
      expect(title.getTitle()).toBe('Privacy Policy | Home Management');
    });
  });

  describe('Meta tags and locale', () => {
    it('should set description, Open Graph, locale and Twitter tags', async () => {
      await navigate('/dashboard/privacy');

      expect(getMeta('name="description"')).toBe('How your data is handled.');
      expect(getMeta('property="og:title"')).toBe('Privacy Policy | Home Management');
      expect(getMeta('property="og:description"')).toBe('How your data is handled.');
      expect(getMeta('property="og:url"')).toBe('https://home-management.dev/dashboard/privacy');
      expect(getMeta('property="og:locale"')).toBe('en_US');
      expect(getMeta('name="twitter:title"')).toBe('Privacy Policy | Home Management');
      expect(getMeta('name="twitter:description"')).toBe('How your data is handled.');
    });

    it('should switch language and update og:locale on localized landing routes', async () => {
      await navigate('/de');

      expect(setLanguageSpy).toHaveBeenCalledWith('de');
      expect(title.getTitle()).toBe('Home Management – Verbrauchstracker');
      expect(getMeta('property="og:locale"')).toBe('de_DE');
      expect(getCanonical()).toBe('https://home-management.dev/de');
    });

    it('should update metadata when the language changes', async () => {
      await navigate('/dashboard/privacy');

      currentLang.set('de');
      TestBed.tick();

      expect(title.getTitle()).toBe('Datenschutzerklärung | Home Management');
      expect(getMeta('name="description"')).toBe('Wie Ihre Daten verarbeitet werden.');
    });
  });

  describe('Canonical URL and hreflang alternates', () => {
    it('should use a trailing slash for the home page and emit hreflang links', async () => {
      await navigate('/');
      expect(getCanonical()).toBe('https://home-management.dev/');

      const alternates = getAlternates();
      expect(alternates).toContainEqual({ hreflang: 'en', href: 'https://home-management.dev/' });
      expect(alternates).toContainEqual({ hreflang: 'de', href: 'https://home-management.dev/de' });
      expect(alternates).toContainEqual({
        hreflang: 'x-default',
        href: 'https://home-management.dev/',
      });
    });

    it('should remove hreflang links when navigating to a non-home route', async () => {
      await navigate('/');
      await navigate('/dashboard/privacy');

      expect(getAlternates()).toEqual([]);
    });

    it('should strip query parameters and fragments', async () => {
      await navigate('/dashboard/privacy?ref=newsletter#cookies');
      expect(getCanonical()).toBe('https://home-management.dev/dashboard/privacy');
    });

    it('should reuse a single canonical link element across navigations', async () => {
      await navigate('/');
      await navigate('/dashboard/privacy');
      expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    });
  });

  describe('Route-level JSON-LD structured data', () => {
    it('should emit FAQPage JSON-LD on the landing page', async () => {
      await navigate('/');
      const jsonLd = getRouteJsonLd();

      expect(jsonLd?.['@type']).toBe('FAQPage');
      expect(Array.isArray(jsonLd?.['mainEntity'])).toBe(true);
    });

    it('should emit BreadcrumbList JSON-LD on subpages', async () => {
      await navigate('/dashboard/privacy');
      const jsonLd = getRouteJsonLd();

      expect(jsonLd?.['@type']).toBe('BreadcrumbList');
    });

    it('should emit BreadcrumbList and Dataset JSON-LD on the benchmarks page', async () => {
      await navigate('/dashboard/benchmarks');
      const jsonLd = getRouteJsonLd();
      const graph = jsonLd?.['@graph'] as Record<string, unknown>[];

      expect(Array.isArray(graph)).toBe(true);
      expect(graph.map((node) => node['@type'])).toEqual(['BreadcrumbList', 'Dataset']);
    });
  });

  describe('Robots directives', () => {
    it('should set noindex and remove canonical, alternates and route JSON-LD for unknown routes', async () => {
      await navigate('/');
      await navigate('/does-not-exist');

      expect(getMeta('name="robots"')).toBe(SEO_ROBOTS_NOINDEX);
      expect(getCanonical()).toBeNull();
      expect(getAlternates()).toEqual([]);
      expect(getRouteJsonLd()).toBeNull();
    });

    it('should remove noindex and restore the canonical link on indexable pages', async () => {
      await navigate('/does-not-exist');
      await navigate('/dashboard/privacy');

      expect(getMeta('name="robots"')).toBeNull();
      expect(getCanonical()).toBe('https://home-management.dev/dashboard/privacy');
    });
  });
});
