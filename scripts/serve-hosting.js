/**
 * Serves the production build the same way Firebase Hosting does in production.
 *
 * Uses superstatic (the engine behind `firebase serve` / the Hosting emulator) with the
 * `hosting` section of firebase.json, so cleanUrls, trailingSlash, rewrites (SPA fallback
 * to index.csr.html, prerendered pages) and response headers (CSP, caching, ...) all match
 * what users receive. Lighthouse CI audits this server instead of the Express SSR server,
 * which is never deployed.
 *
 * Usage: node scripts/serve-hosting.js   (PORT defaults to 4000)
 */
const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const superstaticPatterns = require('superstatic/lib/utils/patterns');
const superstaticServer = require('superstatic').server;

const DEFAULT_PORT = 4000;
const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'firebase.json');
const READY_MESSAGE = 'Firebase Hosting emulation listening on';

/**
 * Converts a firebase.json `source` glob to an absolute URL glob ("**" -> "/**").
 * Always uses forward slashes: superstatic's `glob-slasher` relies on `path.join`,
 * which produces backslashes on Windows and breaks glob matching.
 * @param {string} source - Glob or URL path
 * @returns {string} Forward-slashed absolute URL glob
 */
function toUrlGlob(source) {
  const normalized = source.replace(/\\/g, '/');
  const negated = normalized.startsWith('!');
  const slashed = path.posix.join('/', negated ? normalized.slice(1) : normalized);
  return negated ? `!${slashed}` : slashed;
}

/**
 * Evaluates whether a redirect, rewrite, or header rule matches a request path.
 * Replaces superstatic's built-in `configMatcher` so that:
 * 1. Windows backslashes from `glob-slasher` are normalized to forward slashes.
 * 2. `minimatch@10` is used instead of superstatic's nested `minimatch@6`, which
 *    crashes on `{a,b}` brace globs when `brace-expansion@5` is installed.
 * @param {string} urlPath - Request URL pathname
 * @param {{ glob?: string, source?: string, regex?: string }} rule - Hosting rule
 * @returns {boolean} True when the rule applies to `urlPath`
 */
function matchesRule(urlPath, rule) {
  const cleanPath = toUrlGlob(urlPath);
  const glob = rule.glob || rule.source;
  if (glob) {
    return minimatch(cleanPath, toUrlGlob(glob));
  }
  if (rule.regex) {
    return superstaticPatterns.createRaw(rule.regex).test(cleanPath);
  }
  return false;
}

superstaticPatterns.configMatcher = matchesRule;

/**
 * Creates middleware applying firebase.json `headers` rules to matching responses.
 * Headers are set right before the response head is written so they override
 * defaults (e.g. Content-Type), mirroring Firebase Hosting.
 * @param {{ source?: string, regex?: string, headers?: { key: string, value: string }[] }[]} rules
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => void}
 */
function createHeadersMiddleware(rules = []) {
  const normalizedRules = rules.map((rule) => ({
    ...rule,
    source: rule.source ? toUrlGlob(rule.source) : undefined,
  }));

  return (req, res, next) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const headers = normalizedRules
      .filter((rule) => matchesRule(pathname, rule))
      .flatMap((rule) => rule.headers ?? []);

    if (headers.length > 0) {
      const writeHead = res.writeHead;
      res.writeHead = function (...args) {
        headers.forEach(({ key, value }) => this.setHeader(key, value));
        return writeHead.apply(this, args);
      };
    }
    next();
  };
}

/**
 * Removes `//` and `/* *\/` comments from JSONC text (firebase.json allows comments)
 * while leaving string contents such as URLs untouched.
 * @param {string} text - JSON text that may contain comments
 * @returns {string} Plain JSON text
 */
function stripJsonComments(text) {
  let result = '';
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];

    if (inString) {
      result += char;
      if (char === '\\') {
        result += next ?? '';
        i += 2;
        continue;
      }
      inString = char !== '"';
      i++;
    } else if (char === '"') {
      inString = true;
      result += char;
      i++;
    } else if (char === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (char === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      result += char;
      i++;
    }
  }

  return result;
}

/**
 * Reads the single-site `hosting` configuration from firebase.json.
 * @param {string} [configPath] - Path to firebase.json
 * @returns {Record<string, unknown>} Hosting configuration
 */
function loadHostingConfig(configPath = DEFAULT_CONFIG_PATH) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const { hosting } = JSON.parse(stripJsonComments(raw));

  if (!hosting || Array.isArray(hosting) || typeof hosting.public !== 'string') {
    throw new Error(`Expected a single "hosting" entry with a "public" directory in ${configPath}`);
  }
  return hosting;
}

/**
 * Starts a local server that mirrors Firebase Hosting for the given config.
 * @param {object} [options]
 * @param {number} [options.port] - Port to listen on (0 picks a free port)
 * @param {string} [options.configPath] - Path to firebase.json
 * @param {string} [options.cwd] - Directory the hosting `public` path is relative to
 * @returns {Promise<import('http').Server>} The listening server
 */
function startHostingServer({
  port = DEFAULT_PORT,
  configPath = DEFAULT_CONFIG_PATH,
  cwd = process.cwd(),
} = {}) {
  const hosting = loadHostingConfig(configPath);
  const publicDir = path.resolve(cwd, hosting.public);

  if (!fs.existsSync(publicDir)) {
    return Promise.reject(
      new Error(`Build output not found at ${publicDir}. Run "npm run build" first.`),
    );
  }

  const app = superstaticServer({
    port,
    hostname: 'localhost',
    cwd,
    config: hosting,
    compression: true,
    // superstatic's default stack, with the header step replaced by the cross-platform one
    stack: [
      'protect',
      'redirects',
      createHeadersMiddleware(hosting.headers),
      'env',
      'files',
      'rewrites',
      'missing',
    ],
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(() => resolve(server));
    server.once('error', reject);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  startHostingServer({ port })
    .then((server) => {
      console.info(`${READY_MESSAGE} http://localhost:${server.address().port}`);
    })
    .catch((error) => {
      console.error('Failed to start Firebase Hosting emulation:', error.message);
      process.exit(1);
    });
}

module.exports = {
  stripJsonComments,
  toUrlGlob,
  matchesRule,
  createHeadersMiddleware,
  loadHostingConfig,
  startHostingServer,
  READY_MESSAGE,
};
