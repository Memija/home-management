import { RenderMode, ServerRoute } from '@angular/ssr';
import { LOCALIZED_LANDING_LANGUAGES } from './models/seo.model';

export const serverRoutes: ServerRoute[] = [
  // Public, data-independent pages are prerendered at build time so crawlers and
  // AI engines that don't execute JavaScript still receive full HTML content.
  { path: '', renderMode: RenderMode.Prerender },
  ...LOCALIZED_LANDING_LANGUAGES.map((lang): ServerRoute => ({
    path: lang,
    renderMode: RenderMode.Prerender,
  })),
  { path: 'dashboard/benchmarks', renderMode: RenderMode.Prerender },
  { path: 'dashboard/privacy', renderMode: RenderMode.Prerender },
  { path: 'dashboard/changelog', renderMode: RenderMode.Prerender },
  { path: 'dashboard/release-plan', renderMode: RenderMode.Prerender },
  // Everything else depends on the user's local data and stays client-rendered
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
