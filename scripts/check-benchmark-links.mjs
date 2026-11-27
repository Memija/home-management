import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DATA_PATH = resolve(process.cwd(), 'src/app/models/benchmark-sources.data.ts');

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const HARD_BROKEN_STATUSES = new Set([404, 410]);
const WAF_OR_RATE_STATUSES = new Set([401, 403, 406, 429]);

/**
 * Extracts all [sourceLabel, url] pairs from benchmark-sources.data.ts
 * and groups labels by unique URL.
 */
export function extractBenchmarkSources(sourceText) {
  const objectMatch = sourceText.match(/BENCHMARK_SOURCE_URLS[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!objectMatch) {
    throw new Error('Could not locate BENCHMARK_SOURCE_URLS in source file.');
  }

  const body = objectMatch[1];
  const entryRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_]+))\s*:\s*\n?\s*'([^']+)'/g;
  const byUrl = new Map();
  let totalEntries = 0;

  let match = entryRegex.exec(body);
  while (match !== null) {
    const label = match[1] ?? match[2] ?? match[3];
    const url = match[4];
    totalEntries += 1;

    const existing = byUrl.get(url);
    if (existing) {
      existing.push(label);
    } else {
      byUrl.set(url, [label]);
    }
    match = entryRegex.exec(body);
  }

  const uniqueTargets = Array.from(byUrl.entries()).map(([url, labels]) => ({
    url,
    labels,
  }));

  return { totalEntries, uniqueTargets };
}

function getErrorCode(err) {
  if (!err || typeof err !== 'object') return 'UNKNOWN_ERROR';
  const causeCode = err.cause?.code;
  if (typeof causeCode === 'string' && causeCode.length > 0) {
    return causeCode;
  }
  if (typeof err.name === 'string' && err.name === 'TimeoutError') {
    return 'ETIMEDOUT';
  }
  if (typeof err.code === 'string' && err.code.length > 0) {
    return err.code;
  }
  return err.message || 'FETCH_ERROR';
}

/**
 * Classifies a probe outcome into:
 * - 'ok': HTTP 2xx/3xx reachable
 * - 'broken': HTTP 404/410 or dead DNS (ENOTFOUND) — definite link rot
 * - 'warning': WAF 403/429, geo-timeout, or national-CA TLS quirk on government portals
 */
export function classifyOutcome({ status, errorCode }) {
  if (typeof status === 'number') {
    if (status >= 200 && status < 400) {
      return 'ok';
    }
    if (HARD_BROKEN_STATUSES.has(status)) {
      return 'broken';
    }
    if (WAF_OR_RATE_STATUSES.has(status) || status >= 500) {
      return 'warning';
    }
    return 'broken';
  }

  if (errorCode === 'ENOTFOUND') {
    return 'broken';
  }

  return 'warning';
}

async function probeOnce(url, method, fetchImpl, timeoutMs) {
  const response = await fetchImpl(url, {
    method,
    headers: BROWSER_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    await response.body?.cancel?.();
  } catch {
    // Ignore stream cancel errors after headers are read
  }
  return {
    status: response.status,
    finalUrl: response.url || url,
  };
}

/**
 * Checks a single URL using HEAD first, falling back to GET when HEAD is rejected
 * or returns >= 400, with one retry on transient failures.
 */
export async function checkSingleUrl(
  target,
  { fetchImpl = fetch, timeoutMs = 12000, retryDelayMs = 600 } = {},
) {
  const { url, labels } = target;
  let lastResult = { status: null, finalUrl: url, errorCode: null };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const headRes = await probeOnce(url, 'HEAD', fetchImpl, timeoutMs);
      if (headRes.status >= 200 && headRes.status < 400) {
        return {
          url,
          labels,
          status: headRes.status,
          finalUrl: headRes.finalUrl,
          errorCode: null,
          category: 'ok',
        };
      }
    } catch (err) {
      lastResult = { status: null, finalUrl: url, errorCode: getErrorCode(err) };
    }

    try {
      const getRes = await probeOnce(url, 'GET', fetchImpl, timeoutMs);
      const category = classifyOutcome({ status: getRes.status, errorCode: null });
      lastResult = {
        status: getRes.status,
        finalUrl: getRes.finalUrl,
        errorCode: null,
      };
      if (
        category === 'ok' ||
        HARD_BROKEN_STATUSES.has(getRes.status) ||
        WAF_OR_RATE_STATUSES.has(getRes.status)
      ) {
        return { url, labels, ...lastResult, category };
      }
    } catch (err) {
      const errorCode = getErrorCode(err);
      lastResult = { status: null, finalUrl: url, errorCode };
      if (errorCode === 'ENOTFOUND') {
        return { url, labels, ...lastResult, category: 'broken' };
      }
    }

    if (attempt === 0 && retryDelayMs > 0) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  return {
    url,
    labels,
    ...lastResult,
    category: classifyOutcome(lastResult),
  };
}

/**
 * Validates all unique benchmark URLs with a bounded concurrency pool.
 */
export async function validateAllBenchmarkLinks(
  targets,
  { concurrency = 10, fetchImpl = fetch, timeoutMs = 12000, retryDelayMs = 600, onProgress } = {},
) {
  const results = new Array(targets.length);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < targets.length) {
      const index = cursor;
      cursor += 1;
      const res = await checkSingleUrl(targets[index], {
        fetchImpl,
        timeoutMs,
        retryDelayMs,
      });
      results[index] = res;
      completed += 1;
      onProgress?.(completed, targets.length, res);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, targets.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const ok = results.filter((r) => r.category === 'ok');
  const warnings = results.filter((r) => r.category === 'warning');
  const broken = results.filter((r) => r.category === 'broken');

  return { results, ok, warnings, broken };
}

export function formatMarkdownSummary({ totalEntries, uniqueCount, ok, warnings, broken }) {
  const lines = [
    '## 🔗 Benchmark Source Links Validation Report',
    '',
    broken.length === 0
      ? '### ✅ No Broken Benchmark Links (404 / 410 / Dead DNS) Detected!'
      : `### ❌ ${broken.length} Broken Benchmark Link(s) Detected`,
    '',
    '| Metric | Count |',
    '| :--- | :--- |',
    `| **Registered Source Labels** | \`${totalEntries}\` |`,
    `| **Unique URLs Checked** | \`${uniqueCount}\` |`,
    `| **Reachable (2xx / 3xx)** | \`${ok.length}\` |`,
    `| **WAF / Geo-Restricted / Transient Warnings** | \`${warnings.length}\` |`,
    `| **Broken (404 / 410 / Dead Domain)** | \`${broken.length}\` |`,
    '',
  ];

  if (broken.length > 0) {
    lines.push(
      '### ❌ Broken Links Requiring Update',
      '',
      '| Source Label(s) | URL | Reason |',
      '| :--- | :--- | :--- |',
    );
    for (const item of broken) {
      const reason = item.status ? `HTTP ${item.status}` : item.errorCode;
      lines.push(`| ${item.labels.join(', ')} | ${item.url} | \`${reason}\` |`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(
      '<details><summary>⚠️ WAF / Geo-Blocked / Timeout Warnings (Non-Fatal)</summary>',
      '',
      '| Source Label(s) | URL | Detail |',
      '| :--- | :--- | :--- |',
    );
    for (const item of warnings) {
      const detail = item.status ? `HTTP ${item.status}` : item.errorCode;
      lines.push(`| ${item.labels.join(', ')} | ${item.url} | \`${detail}\` |`);
    }
    lines.push('', '</details>', '');
  }

  return lines.join('\n');
}

async function runCli() {
  const args = process.argv.slice(2);
  const strictWarnings = args.includes('--strict');
  const jsonReportIdx = args.indexOf('--json');
  const jsonOutputPath = jsonReportIdx !== -1 ? args[jsonReportIdx + 1] : null;

  const sourceText = readFileSync(DEFAULT_DATA_PATH, 'utf8');
  const { totalEntries, uniqueTargets } = extractBenchmarkSources(sourceText);

  console.log(
    `Checking ${uniqueTargets.length} unique URLs (${totalEntries} total benchmark labels)...`,
  );

  const summary = await validateAllBenchmarkLinks(uniqueTargets, {
    concurrency: 12,
    timeoutMs: 10000,
    retryDelayMs: 500,
  });

  console.log(
    `\nSummary: ${summary.ok.length} OK | ${summary.warnings.length} Warnings | ${summary.broken.length} Broken`,
  );

  if (summary.broken.length > 0) {
    console.error('\nBroken URLs (404 / 410 / ENOTFOUND):');
    for (const item of summary.broken) {
      const reason = item.status ? `HTTP ${item.status}` : item.errorCode;
      console.error(`  [BROKEN: ${reason}] ${item.labels.join(', ')} -> ${item.url}`);
    }
  }

  if (summary.warnings.length > 0) {
    console.warn('\nWarnings (WAF 403 / Geo-timeout / Govt TLS):');
    for (const item of summary.warnings) {
      const reason = item.status ? `HTTP ${item.status}` : item.errorCode;
      console.warn(`  [WARN: ${reason}] ${item.labels.join(', ')} -> ${item.url}`);
    }
  }

  if (jsonOutputPath) {
    writeFileSync(jsonOutputPath, JSON.stringify(summary, null, 2), 'utf8');
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = formatMarkdownSummary({
      totalEntries,
      uniqueCount: uniqueTargets.length,
      ...summary,
    });
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`, 'utf8');
  }

  if (summary.broken.length > 0 || (strictWarnings && summary.warnings.length > 0)) {
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isDirectExecution) {
  runCli().catch((err) => {
    console.error('Benchmark link validation failed unexpectedly:', err);
    process.exitCode = 1;
  });
}
