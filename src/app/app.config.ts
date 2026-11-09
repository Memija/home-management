import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, Routes, CanActivateFn, CanDeactivateFn } from '@angular/router';

import { GlobalErrorHandlerService } from './services/global-error-handler.service';
import { Language, LanguageService } from './services/language.service';
import { SeoService } from './services/seo.service';
import {
  LOCALIZED_LANDING_LANGUAGES,
  SEO_ROBOTS_NOINDEX,
  SEO_ROUTE_DATA_KEY,
  SeoRouteData,
} from './models/seo.model';

interface CanDeactivateComponent {
  canDeactivate?: () => boolean | Promise<boolean>;
}

// CanDeactivate guard for settings - lazy loaded component
const canDeactivateSettings: CanDeactivateFn<CanDeactivateComponent> = (component) => {
  return typeof component?.canDeactivate === 'function' ? component.canDeactivate() : true;
};

/** Ensures the route's language translations are loaded before activation (including SSR prerender) */
const languageGuard =
  (lang: Language): CanActivateFn =>
  async () => {
    await inject(LanguageService).setLanguage(lang);
    return true;
  };

/** Builds typed route data carrying the page's SEO configuration */
const seo = (data: SeoRouteData) => ({ [SEO_ROUTE_DATA_KEY]: data });

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
    data: seo({ page: 'HOME', standaloneTitle: true }),
  },
  ...LOCALIZED_LANDING_LANGUAGES.map((lang) => ({
    path: lang,
    canActivate: [languageGuard(lang)],
    loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
    data: seo({ page: 'HOME', standaloneTitle: true, lang }),
  })),
  {
    path: 'benchmarks',
    redirectTo: 'dashboard/benchmarks',
    pathMatch: 'full' as const,
  },
  {
    path: 'legal',
    redirectTo: 'dashboard/privacy',
    pathMatch: 'full' as const,
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./layout/app-layout.component').then((m) => m.AppLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: seo({ page: 'DASHBOARD' }),
      },
      {
        path: 'water',
        loadComponent: () => import('./water/water.component').then((m) => m.WaterComponent),
        data: seo({ page: 'WATER' }),
      },
      {
        path: 'heating',
        loadComponent: () => import('./heating/heating.component').then((m) => m.HeatingComponent),
        data: seo({ page: 'HEATING' }),
      },
      {
        path: 'electricity',
        loadComponent: () =>
          import('./electricity/electricity.component').then((m) => m.ElectricityComponent),
        data: seo({ page: 'ELECTRICITY' }),
      },
      {
        path: 'benchmarks',
        loadComponent: () =>
          import('./benchmarks/benchmarks.component').then((m) => m.BenchmarksComponent),
        data: seo({ page: 'BENCHMARKS' }),
      },
      {
        path: 'release-plan',
        loadComponent: () =>
          import('./release-plan/release-plan.component').then((m) => m.ReleasePlanComponent),
        data: seo({ page: 'RELEASE_PLAN' }),
      },
      {
        path: 'changelog',
        loadComponent: () =>
          import('./changelog/changelog.component').then((m) => m.ChangelogComponent),
        data: seo({ page: 'CHANGELOG' }),
      },
      {
        path: 'privacy',
        loadComponent: () => import('./privacy/privacy.component').then((m) => m.PrivacyComponent),
        data: seo({ page: 'PRIVACY' }),
      },
      {
        path: 'legal',
        redirectTo: 'privacy',
        pathMatch: 'full' as const,
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings.component').then((m) => m.SettingsComponent),
        canDeactivate: [canDeactivateSettings],
        data: seo({ page: 'SETTINGS', robots: SEO_ROBOTS_NOINDEX }),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
    data: seo({ page: 'NOT_FOUND', robots: SEO_ROBOTS_NOINDEX }),
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    // Block bootstrap until the initial translations are loaded so prerendered
    // HTML (and the first client render) contains real text instead of keys.
    provideAppInitializer(() => inject(LanguageService).ready),
    // Keep per-route title, description, canonical and robots tags in sync
    provideEnvironmentInitializer(() => inject(SeoService)),
    // Suppress browser-extension errors (e.g. chrome.runtime.lastError) that
    // Angular 21's global error listeners would otherwise forward to the console.
    { provide: ErrorHandler, useExisting: GlobalErrorHandlerService },
  ],
};
