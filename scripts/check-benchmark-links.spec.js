import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  checkSingleUrl,
  classifyOutcome,
  extractBenchmarkSources,
  formatMarkdownSummary,
  validateAllBenchmarkLinks,
} from './check-benchmark-links.mjs';

describe('check-benchmark-links script', () => {
  it('should extract and deduplicate all benchmark URLs from benchmark-sources.data.ts', () => {
    const filePath = resolve(process.cwd(), 'src/app/models/benchmark-sources.data.ts');
    const content = readFileSync(filePath, 'utf8');
    const { totalEntries, uniqueTargets } = extractBenchmarkSources(content);

    expect(totalEntries).toBeGreaterThan(150);
    expect(uniqueTargets.length).toBeGreaterThan(130);
    expect(uniqueTargets.length).toBeLessThanOrEqual(totalEntries);

    for (const target of uniqueTargets) {
      expect(target.url).toMatch(/^https:\/\/.+/);
      expect(target.labels.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should classify HTTP statuses and network error codes accurately', () => {
    expect(classifyOutcome({ status: 200, errorCode: null })).toBe('ok');
    expect(classifyOutcome({ status: 301, errorCode: null })).toBe('ok');
    expect(classifyOutcome({ status: 404, errorCode: null })).toBe('broken');
    expect(classifyOutcome({ status: 410, errorCode: null })).toBe('broken');
    expect(classifyOutcome({ status: null, errorCode: 'ENOTFOUND' })).toBe('broken');
    expect(classifyOutcome({ status: 403, errorCode: null })).toBe('warning');
    expect(classifyOutcome({ status: 429, errorCode: null })).toBe('warning');
    expect(classifyOutcome({ status: 503, errorCode: null })).toBe('warning');
    expect(classifyOutcome({ status: null, errorCode: 'ETIMEDOUT' })).toBe('warning');
    expect(classifyOutcome({ status: null, errorCode: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' })).toBe(
      'warning',
    );
  });

  it('should succeed immediately when HEAD returns 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      url: 'https://example.org/',
      body: { cancel: vi.fn() },
    });

    const res = await checkSingleUrl(
      { url: 'https://example.org/', labels: ['Example'] },
      { fetchImpl: fetchMock, retryDelayMs: 0 },
    );

    expect(res.category).toBe('ok');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
  });

  it('should fall back to GET when HEAD returns 405 Method Not Allowed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 405, url: 'https://gov.example/', body: null })
      .mockResolvedValueOnce({ status: 200, url: 'https://gov.example/', body: null });

    const res = await checkSingleUrl(
      { url: 'https://gov.example/', labels: ['Gov Portal'] },
      { fetchImpl: fetchMock, retryDelayMs: 0 },
    );

    expect(res.category).toBe('ok');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
    expect(fetchMock.mock.calls[1][1].method).toBe('GET');
  });

  it('should mark 404 responses and ENOTFOUND domains as broken', async () => {
    const notFoundFetch = vi.fn().mockResolvedValue({
      status: 404,
      url: 'https://example.org/missing',
      body: null,
    });
    const r404 = await checkSingleUrl(
      { url: 'https://example.org/missing', labels: ['Missing Page'] },
      { fetchImpl: notFoundFetch, retryDelayMs: 0 },
    );
    expect(r404.category).toBe('broken');
    expect(r404.status).toBe(404);

    const dnsError = Object.assign(new Error('fetch failed'), {
      cause: { code: 'ENOTFOUND' },
    });
    const deadDnsFetch = vi.fn().mockRejectedValue(dnsError);
    const rDns = await checkSingleUrl(
      { url: 'https://dead.invalid/', labels: ['Dead Host'] },
      { fetchImpl: deadDnsFetch, retryDelayMs: 0 },
    );
    expect(rDns.category).toBe('broken');
    expect(rDns.errorCode).toBe('ENOTFOUND');
  });

  it('should aggregate pool results and format a Markdown report', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('broken')) return { status: 404, url, body: null };
      if (url.includes('waf')) return { status: 403, url, body: null };
      return { status: 200, url, body: null };
    });

    const targets = [
      { url: 'https://ok.example/', labels: ['OK Agency'] },
      { url: 'https://waf.example/', labels: ['WAF Agency'] },
      { url: 'https://broken.example/', labels: ['Moved Agency'] },
    ];

    const summary = await validateAllBenchmarkLinks(targets, {
      concurrency: 2,
      fetchImpl: fetchMock,
      retryDelayMs: 0,
    });

    expect(summary.ok).toHaveLength(1);
    expect(summary.warnings).toHaveLength(1);
    expect(summary.broken).toHaveLength(1);

    const md = formatMarkdownSummary({
      totalEntries: 3,
      uniqueCount: 3,
      ...summary,
    });
    expect(md).toContain('1 Broken Benchmark Link(s) Detected');
    expect(md).toContain('Moved Agency');
    expect(md).toContain('HTTP 404');
  });
});
