import { en } from './en';
import { de } from './de';
import { bs } from './bs';
import { sr } from './sr';
import { id } from './id';
import { pl } from './pl';

// Static imports for module-level integrity checks
import * as enModules from './modules/en';
import * as deModules from './modules/de';
import * as bsModules from './modules/bs';
import * as srModules from './modules/sr';
import * as idModules from './modules/id';
import * as plModules from './modules/pl';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_LANG_MODULES: Record<string, any> = {
  en: enModules,
  de: deModules,
  bs: bsModules,
  sr: srModules,
  id: idModules,
  pl: plModules,
};

/**
 * Maps a module path to its export name in the index file.
 * Example: 'common' -> 'common'
 * Example: 'water-facts' -> 'waterFacts'
 * Example: 'country-facts/index' -> 'countryFacts'
 */
function getExportKey(modName: string): string {
  const base = modName.split('/')[0];
  return base.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

type TranslationObject = Record<string, unknown>;

/**
 * Collects every leaf path from a (possibly nested) translation object.
 * Array-valued leaves are stored as a single path with their value.
 */
function collectLeaves(obj: TranslationObject, prefix = ''): Map<string, unknown> {
  const result = new Map<string, unknown>();
  if (!obj || typeof obj !== 'object') return result;

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = (obj as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      result.set(fullKey, value);
    } else if (value !== null && typeof value === 'object') {
      const nested = collectLeaves(value as TranslationObject, fullKey);
      nested.forEach((v, k) => result.set(k, v));
    } else {
      result.set(fullKey, value);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build the English baseline once
// ---------------------------------------------------------------------------
const enLeaves = collectLeaves(en as unknown as TranslationObject);

// ---------------------------------------------------------------------------
// Languages to verify
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { name: 'German', code: 'de', obj: de },
  { name: 'Bosnian', code: 'bs', obj: bs },
  { name: 'Serbian', code: 'sr', obj: sr },
  { name: 'Indonesian', code: 'id', obj: id },
  { name: 'Polish', code: 'pl', obj: pl },
] as const;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('I18n — English as baseline', () => {
  for (const { name, code, obj } of LANGUAGES) {
    describe(`${name} (${code})`, () => {
      const langLeaves = collectLeaves(obj as unknown as TranslationObject);

      // -----------------------------------------------------------------------
      // 1. No missing keys
      // -----------------------------------------------------------------------
      it('should contain every English key', () => {
        const missing: string[] = [];

        for (const key of enLeaves.keys()) {
          if (!langLeaves.has(key)) {
            missing.push(key);
          }
        }

        expect(
          missing,
          `[${code}] Missing ${missing.length} key(s) that exist in English:\n  ${missing.join(
            '\n  ',
          )}`,
        ).toEqual([]);
      });

      // -----------------------------------------------------------------------
      // 2. No extra keys
      // -----------------------------------------------------------------------
      it('should not have keys that are absent from English', () => {
        const extra: string[] = [];

        for (const key of langLeaves.keys()) {
          if (!enLeaves.has(key)) {
            extra.push(key);
          }
        }

        expect(
          extra,
          `[${code}] Has ${extra.length} extra key(s) not present in English:\n  ${extra.join(
            '\n  ',
          )}`,
        ).toEqual([]);
      });

      // -----------------------------------------------------------------------
      // 3. Array type & length checks
      // -----------------------------------------------------------------------
      it('should have correctly-typed arrays for all English array keys', () => {
        const allIssues: string[] = [];

        for (const [key, enValue] of enLeaves.entries()) {
          if (!Array.isArray(enValue)) continue;

          const langValue = langLeaves.get(key);

          if (!Array.isArray(langValue)) {
            allIssues.push(
              `[wrong type] ${key}: English has array[${
                (enValue as unknown[]).length
              }] but ${code} has ${typeof langValue}`,
            );
            continue;
          }

          if ((langValue as unknown[]).length !== (enValue as unknown[]).length) {
            allIssues.push(
              `[length mismatch] ${key}: English[${(enValue as unknown[]).length}] vs ${code}[${
                (langValue as unknown[]).length
              }]`,
            );
          }
        }

        expect(allIssues, `[${code}] Array issues:\n  ${allIssues.join('\n  ')}`).toEqual([]);
      });
    });
  }

  // -------------------------------------------------------------------------
  // 4. Module-level Integrity (Detects shadowed keys and module mismatches)
  // -------------------------------------------------------------------------
  describe('Module-level Integrity', () => {
    const SPREAD_MODULES = [
      'common',
      'water',
      'heating',
      'settings',
      'chart',
      'countries',
      'contact',
      'errors',
      'excel',
      'electricity',
      'auth',
      'landing',
      'privacy',
    ];

    const ASSIGNED_MODULES = [
      { path: 'water-facts', key: 'WATER_FACTS' },
      { path: 'country-facts/index', key: 'COUNTRY_FACTS' },
      { path: 'electricity-country-facts/index', key: 'ELECTRICITY_COUNTRY_FACTS' },
      { path: 'heating-country-facts/index', key: 'HEATING_COUNTRY_FACTS' },
    ];

    const ALL_MODULES_TO_CHECK = [...SPREAD_MODULES, ...ASSIGNED_MODULES.map((m) => m.path)];

    for (const { code } of LANGUAGES) {
      it(`[${code}] each module should strictly match its English counterpart`, () => {
        const moduleIssues: string[] = [];
        const enModSet = ALL_LANG_MODULES['en'];
        const langModSet = ALL_LANG_MODULES[code];

        for (const modName of ALL_MODULES_TO_CHECK) {
          const exportKey = getExportKey(modName);

          const enMod = enModSet[exportKey];
          const langMod = langModSet[exportKey];

          if (!enMod) {
            throw new Error(`English export not found for "${modName}" (key: ${exportKey})`);
          }
          if (!langMod) {
            moduleIssues.push(`Module "${modName}" (export key: ${exportKey}) is missing in ${code}`);
            continue;
          }

          const enExports = Object.keys(enMod).filter((k) => k !== 'default');
          const langExports = Object.keys(langMod).filter((k) => k !== 'default');

          const extraExports = langExports.filter((k) => !enExports.includes(k));
          const missingExports = enExports.filter((k) => !langExports.includes(k));

          if (extraExports.length > 0) {
            moduleIssues.push(
              `Module "${modName}" has extra exports in ${code}: ${extraExports.join(', ')}`,
            );
          }
          if (missingExports.length > 0) {
            moduleIssues.push(
              `Module "${modName}" is missing exports in ${code}: ${missingExports.join(', ')}`,
            );
          }

          for (const exp of enExports) {
            if (!langExports.includes(exp)) continue;

            const enObj = enMod[exp] as Record<string, unknown>;
            const langObj = langMod[exp] as Record<string, unknown>;

            if (typeof enObj !== 'object' || enObj === null || Array.isArray(enObj)) continue;
            if (typeof langObj !== 'object' || langObj === null || Array.isArray(langObj)) {
              moduleIssues.push(
                `Module "${modName}", export "${exp}": English is object but ${code} is ${typeof langObj}`,
              );
              continue;
            }

            const enKeys = Object.keys(enObj);
            const langKeys = Object.keys(langObj);

            const extraKeys = langKeys.filter((k) => !enKeys.includes(k));
            const missingKeys = enKeys.filter((k) => !langKeys.includes(k));

            if (extraKeys.length > 0) {
              moduleIssues.push(
                `Module "${modName}", export "${exp}": Extra keys in ${code}:\n    ${extraKeys.join(
                  '\n    ',
                )}`,
              );
            }
            if (missingKeys.length > 0) {
              moduleIssues.push(
                `Module "${modName}", export "${exp}": Missing keys in ${code}:\n    ${missingKeys.join(
                  '\n    ',
                )}`,
              );
            }
          }
        }

        expect(
          moduleIssues,
          `[${code}] Module-level mismatches:\n  ${moduleIssues.join('\n  ')}`,
        ).toEqual([]);
      });

      it(`[${code}] should not have top-level key shadowing (collisions between modules)`, () => {
        const collisions: string[] = [];
        const seenKeys = new Map<string, string>();
        const langModSet = ALL_LANG_MODULES[code];

        for (const modName of SPREAD_MODULES) {
          const exportKey = getExportKey(modName);
          const mod = langModSet[exportKey];
          if (!mod) continue;

          // In our architecture, these modules are spread: { ...common, ...water }
          // So the top-level keys of each module must be unique across all modules.
          for (const key of Object.keys(mod)) {
            if (seenKeys.has(key)) {
              collisions.push(
                `Top-level key "${key}" in module "${modName}" (shadows key from "${seenKeys.get(key)}")`,
              );
            }
            seenKeys.set(key, modName);
          }
        }

        for (const { path: modPath, key } of ASSIGNED_MODULES) {
          if (seenKeys.has(key)) {
            collisions.push(
              `Top-level assignment key "${key}" (from module "${modPath}") shadows key from "${seenKeys.get(
                key,
              )}"`,
            );
          }
          seenKeys.set(key, modPath);
        }

        expect(
          collisions,
          `[${code}] Top-level key collisions detected:\n  ${collisions.join('\n  ')}`,
        ).toEqual([]);
      });
    }
  });

  // -------------------------------------------------------------------------
  // 5. Global sanity: language service registration
  // -------------------------------------------------------------------------
  it('should register all languages in LanguageService', async () => {
    const { SUPPORTED_LANGUAGES } = await import('../services/language.service');
    const expectedCodes = ['en', 'de', 'bs', 'sr', 'id', 'pl'];
    for (const code of expectedCodes) {
      expect(SUPPORTED_LANGUAGES, `Language "${code}" is missing from SUPPORTED_LANGUAGES`).toContain(
        code,
      );
    }
  });
});
