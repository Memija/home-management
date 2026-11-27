import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  PAGES,
  LANDING_ALTERNATES,
  getLastModified,
  buildSitemapXml,
  collectEntries,
  writeSitemap,
} from './generate-sitemap.js';

describe('generate-sitemap', () => {
  describe('buildSitemapXml', () => {
    it('should render entries with and without lastmod and hreflang alternates', () => {
      const xml = buildSitemapXml([
        {
          loc: 'https://example.com/',
          lastmod: '2026-11-07',
          alternates: [{ hreflang: 'de', href: 'https://example.com/de' }],
        },
        { loc: 'https://example.com/about', lastmod: null },
      ]);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
      expect(xml).toContain(
        '<url>\n    <loc>https://example.com/</loc>\n    <lastmod>2026-11-07</lastmod>\n    <xhtml:link rel="alternate" hreflang="de" href="https://example.com/de" />\n  </url>',
      );
      expect(xml).toContain('<url>\n    <loc>https://example.com/about</loc>\n  </url>');
    });
  });

  describe('getLastModified', () => {
    it('should return an ISO date for tracked paths', () => {
      expect(getLastModified(['package.json'])).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return null when no commit touches the paths', () => {
      expect(getLastModified(['this/path/does/not/exist.txt'])).toBeNull();
    });
  });

  describe('collectEntries', () => {
    it('should produce one absolute production URL per page including localized landing pages and benchmarks', () => {
      const entries = collectEntries();
      expect(entries.map((entry) => entry.loc)).toEqual(
        PAGES.map((page) => `https://home-management.dev${page.path}`),
      );
      expect(entries.some((e) => e.loc === 'https://home-management.dev/de')).toBe(true);
      expect(
        entries.some((e) => e.loc === 'https://home-management.dev/dashboard/benchmarks'),
      ).toBe(true);
      expect(entries[0].alternates).toEqual(LANDING_ALTERNATES);
    });

    it('should only list slash-less URLs (except the root) to match canonical URLs', () => {
      PAGES.filter((page) => page.path !== '/').forEach((page) => {
        expect(page.path.endsWith('/')).toBe(false);
      });
    });
  });

  describe('writeSitemap', () => {
    let tempDir;

    afterEach(() => {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should write the sitemap into an existing build directory', () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-'));
      const outputPath = path.join(tempDir, 'sitemap.xml');

      expect(writeSitemap(outputPath)).toBe(true);
      expect(fs.readFileSync(outputPath, 'utf8')).toContain(
        '<loc>https://home-management.dev/</loc>',
      );
    });

    it('should not write anything when the build directory is missing', () => {
      const outputPath = path.join(os.tmpdir(), 'missing-build-dir-xyz', 'sitemap.xml');
      expect(writeSitemap(outputPath)).toBe(false);
      expect(fs.existsSync(outputPath)).toBe(false);
    });
  });
});
