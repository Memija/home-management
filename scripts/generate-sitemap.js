/**
 * Generates sitemap.xml in the build output after `ng build`.
 *
 * Each page's <lastmod> is the date of the most recent git commit that touched
 * the page's source files (component, its translations, and shared SEO metadata),
 * so search engines see accurate change dates without manual upkeep.
 * Pages whose date can't be determined (e.g. git unavailable) are listed without <lastmod>.
 *
 * Keep PAGES in sync with the indexable routes in src/app/app.config.ts.
 *
 * Usage: node scripts/generate-sitemap.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SITE_URL = 'https://home-management.dev';
const OUTPUT_PATH = path.resolve(process.cwd(), 'dist/home-management/browser/sitemap.xml');

/** Source files shared by every page (titles, descriptions, structured data) */
const SHARED_SOURCES = ['src/index.html', 'src/app/i18n/modules/*/seo.ts'];

/** Localized landing page variants for hreflang alternate links */
const LANDING_ALTERNATES = [
  { hreflang: 'en', href: `${SITE_URL}/` },
  { hreflang: 'de', href: `${SITE_URL}/de` },
  { hreflang: 'bs', href: `${SITE_URL}/bs` },
  { hreflang: 'sr', href: `${SITE_URL}/sr` },
  { hreflang: 'id', href: `${SITE_URL}/id` },
  { hreflang: 'pl', href: `${SITE_URL}/pl` },
  { hreflang: 'x-default', href: `${SITE_URL}/` },
];

/** Indexable pages and the source paths whose changes affect their content */
const PAGES = [
  {
    path: '/',
    sources: ['src/app/landing', 'src/app/i18n/modules/en/landing.ts'],
    alternates: LANDING_ALTERNATES,
  },
  {
    path: '/de',
    sources: ['src/app/landing', 'src/app/i18n/modules/de/landing.ts'],
    alternates: LANDING_ALTERNATES,
  },
  {
    path: '/bs',
    sources: ['src/app/landing', 'src/app/i18n/modules/bs/landing.ts'],
    alternates: LANDING_ALTERNATES,
  },
  {
    path: '/sr',
    sources: ['src/app/landing', 'src/app/i18n/modules/sr/landing.ts'],
    alternates: LANDING_ALTERNATES,
  },
  {
    path: '/id',
    sources: ['src/app/landing', 'src/app/i18n/modules/id/landing.ts'],
    alternates: LANDING_ALTERNATES,
  },
  {
    path: '/pl',
    sources: ['src/app/landing', 'src/app/i18n/modules/pl/landing.ts'],
    alternates: LANDING_ALTERNATES,
  },
  { path: '/dashboard', sources: ['src/app/dashboard'] },
  {
    path: '/dashboard/benchmarks',
    sources: [
      'src/app/benchmarks',
      'src/app/services/water-averages.service.ts',
      'src/app/services/electricity-averages.service.ts',
      'src/app/services/heating-averages.service.ts',
    ],
  },
  {
    path: '/dashboard/privacy',
    sources: ['src/app/privacy', 'src/app/i18n/modules/*/privacy.ts'],
  },
  { path: '/dashboard/release-plan', sources: ['src/app/release-plan'] },
  { path: '/dashboard/changelog', sources: ['src/app/changelog'] },
];

/**
 * Returns the commit date (YYYY-MM-DD) of the latest commit touching any of the paths.
 * @param {string[]} sources - Git pathspecs (globs allowed)
 * @returns {string | null} ISO date or null when unavailable
 */
function getLastModified(sources) {
  try {
    const output = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...sources], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(output) ? output : null;
  } catch {
    return null;
  }
}

/**
 * Builds the sitemap XML document.
 * @param {{ loc: string, lastmod: string | null, alternates?: { hreflang: string, href: string }[] }[]} entries
 * @returns {string} Sitemap XML
 */
function buildSitemapXml(entries) {
  const urls = entries
    .map(({ loc, lastmod, alternates }) => {
      const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
      const alternateTags = (alternates ?? [])
        .map(
          ({ hreflang, href }) =>
            `\n    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`,
        )
        .join('');
      return `  <url>\n    <loc>${loc}</loc>${lastmodTag}${alternateTags}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

/**
 * Resolves every page to its absolute URL, last modification date, and optional alternates.
 * @returns {{ loc: string, lastmod: string | null, alternates?: { hreflang: string, href: string }[] }[]} Sitemap entries
 */
function collectEntries() {
  return PAGES.map((page) => ({
    loc: `${SITE_URL}${page.path}`,
    lastmod: getLastModified([...page.sources, ...SHARED_SOURCES]),
    alternates: page.alternates,
  }));
}

/**
 * Writes the sitemap into the build output directory.
 * @param {string} [outputPath] - Destination file
 * @returns {boolean} True when the sitemap was written
 */
function writeSitemap(outputPath = OUTPUT_PATH) {
  if (!fs.existsSync(path.dirname(outputPath))) {
    console.error(`Build output not found at ${path.dirname(outputPath)}. Run ng build first.`);
    return false;
  }
  const entries = collectEntries();
  fs.writeFileSync(outputPath, buildSitemapXml(entries));
  console.info(`Sitemap written with ${entries.length} URLs: ${outputPath}`);
  return true;
}

if (require.main === module && !writeSitemap()) {
  process.exit(1);
}

module.exports = {
  PAGES,
  LANDING_ALTERNATES,
  getLastModified,
  buildSitemapXml,
  collectEntries,
  writeSitemap,
};
