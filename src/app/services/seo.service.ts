import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SITE_NAME, SITE_URL } from '../app.constants';
import {
  FAQ_KEYS,
  LANDING_LANGUAGE_PATHS,
  OG_LOCALES,
  SEO_ROUTE_DATA_KEY,
  SeoPage,
  SeoRouteData,
} from '../models/seo.model';
import { LanguageService, SUPPORTED_LANGUAGES } from './language.service';

/** Snapshot of the page whose metadata should be rendered */
interface SeoPageState {
  readonly path: string;
  readonly seo: SeoRouteData;
}

const ROUTE_JSONLD_ID = 'seo-route-jsonld';

/**
 * Keeps per-route SEO metadata (title, description, canonical URL, hreflang alternates,
 * Open Graph, Twitter card, robots directives, and route-level JSON-LD) in sync with
 * the active route and language.
 *
 * Routes opt in via `data: { seo: SeoRouteData }`. Works on the server too, so
 * prerendered pages ship with complete metadata for search and AI crawlers.
 */
@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly languageService = inject(LanguageService);

  private readonly currentPage = signal<SeoPageState | null>(null);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((event) => this.onNavigationEnd(event));

    // Re-applies metadata whenever the page or the active language/translations change
    effect(() => {
      const page = this.currentPage();
      if (page) {
        this.applyPage(page);
      }
    });
  }

  private onNavigationEnd(event: NavigationEnd): void {
    const seo = this.findSeoData(this.router.routerState.snapshot.root);
    if (!seo) {
      return;
    }
    if (seo.lang && seo.lang !== this.languageService.currentLang()) {
      void this.languageService.setLanguage(seo.lang);
    }
    this.currentPage.set({ path: this.normalizePath(event.urlAfterRedirects), seo });
  }

  /** Returns the SEO data of the deepest activated route that defines it */
  private findSeoData(root: ActivatedRouteSnapshot): SeoRouteData | null {
    let found: SeoRouteData | null = null;
    let route: ActivatedRouteSnapshot | null = root;
    while (route) {
      const seo = route.data[SEO_ROUTE_DATA_KEY] as SeoRouteData | undefined;
      found = seo ?? found;
      route = route.firstChild;
    }
    return found;
  }

  /** Strips query string, fragment and trailing slash so canonical URLs stay consistent */
  private normalizePath(url: string): string {
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return path || '/';
  }

  private applyPage({ path, seo }: SeoPageState): void {
    const titleKey = `SEO.${seo.page}.TITLE`;
    const pageTitle = this.languageService.translate(titleKey);

    // Translations not loaded yet: keep the static defaults from index.html
    if (pageTitle === titleKey) {
      return;
    }

    const fullTitle = seo.standaloneTitle ? pageTitle : `${pageTitle} | ${SITE_NAME}`;
    const description = this.languageService.translate(`SEO.${seo.page}.DESCRIPTION`);
    const url = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
    const lang = this.languageService.currentLang();

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:locale', content: OG_LOCALES[lang] ?? OG_LOCALES.en });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    if (seo.robots) {
      this.meta.updateTag({ name: 'robots', content: seo.robots });
      this.removeCanonical();
      this.removeAlternateLinks();
      this.removeRouteJsonLd();
      return;
    }

    this.meta.removeTag('name="robots"');
    this.setCanonical(url);

    if (seo.page === 'HOME') {
      this.setHomeAlternateLinks();
    } else {
      this.removeAlternateLinks();
    }

    this.setRouteJsonLd(seo.page, pageTitle, description, url);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private removeCanonical(): void {
    this.document.head.querySelector('link[rel="canonical"]')?.remove();
  }

  private setHomeAlternateLinks(): void {
    this.removeAlternateLinks();
    for (const lang of SUPPORTED_LANGUAGES) {
      const langPath = LANDING_LANGUAGE_PATHS[lang];
      const href = langPath === '/' ? `${SITE_URL}/` : `${SITE_URL}${langPath}`;
      this.appendAlternateLink(lang, href);
    }
    this.appendAlternateLink('x-default', `${SITE_URL}/`);
  }

  private appendAlternateLink(hreflang: string, href: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', hreflang);
    link.setAttribute('href', href);
    this.document.head.appendChild(link);
  }

  private removeAlternateLinks(): void {
    this.document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((el) => el.remove());
  }

  private setRouteJsonLd(page: SeoPage, pageTitle: string, description: string, url: string): void {
    const payload =
      page === 'HOME'
        ? this.buildFaqSchema()
        : this.buildSubpageSchema(page, pageTitle, description, url);

    let script = this.document.getElementById(ROUTE_JSONLD_ID) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = ROUTE_JSONLD_ID;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(payload);
  }

  private removeRouteJsonLd(): void {
    this.document.getElementById(ROUTE_JSONLD_ID)?.remove();
  }

  private buildFaqSchema(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_KEYS.map((item) => ({
        '@type': 'Question',
        name: this.languageService.translate(item.questionKey),
        acceptedAnswer: {
          '@type': 'Answer',
          text: this.languageService.translate(item.answerKey),
        },
      })),
    };
  }

  private buildSubpageSchema(
    page: SeoPage,
    pageTitle: string,
    description: string,
    url: string,
  ): Record<string, unknown> {
    const breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: SITE_NAME,
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: pageTitle,
          item: url,
        },
      ],
    };

    if (page !== 'BENCHMARKS') {
      return { '@context': 'https://schema.org', ...breadcrumb };
    }

    return {
      '@context': 'https://schema.org',
      '@graph': [
        breadcrumb,
        {
          '@type': 'Dataset',
          name: pageTitle,
          description,
          url,
          isAccessibleForFree: true,
          license: 'https://github.com/Memija/home-management/blob/main/LICENSE.md',
          creator: {
            '@type': 'Person',
            '@id': `${SITE_URL}/#author`,
            name: 'Anel Memija',
            url: 'https://github.com/Memija',
          },
          variableMeasured: [
            'Household water consumption (liters per person per day)',
            'Household electricity consumption (kWh per person per year)',
            'Household heating consumption (kWh per household per year)',
          ],
        },
      ],
    };
  }
}
