import { describe, it, expect } from 'vitest';
import { en } from './en';
import { de } from './de';
import { bs } from './bs';

function getKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

describe('i18n translations', () => {
  const enKeys = getKeys(en).sort();

  it('should have the same keys for en and de', () => {
    const deKeys = getKeys(de).sort();

    // Check for keys in EN but missing in DE
    const missingInDe = enKeys.filter((key) => !deKeys.includes(key));
    if (missingInDe.length > 0) {
      console.error('Missing keys in DE:', missingInDe);
    }

    // Check for keys in DE but missing in EN
    const missingInEn = deKeys.filter((key) => !enKeys.includes(key));
    if (missingInEn.length > 0) {
      console.error('Missing keys in EN (from DE):', missingInEn);
    }

    expect(missingInDe, `Keys missing in DE: ${JSON.stringify(missingInDe)}`).toEqual([]);
    expect(missingInEn, `Keys missing in EN (from DE): ${JSON.stringify(missingInEn)}`).toEqual([]);
  });

  it('should have the same keys for en and bs', () => {
    const bsKeys = getKeys(bs).sort();

    // Check for keys in EN but missing in BS
    const missingInBs = enKeys.filter((key) => !bsKeys.includes(key));
    if (missingInBs.length > 0) {
      console.error('Missing keys in BS:', missingInBs);
    }

    // Check for keys in BS but missing in EN
    const extraInBs = bsKeys.filter((key) => !enKeys.includes(key));
    if (extraInBs.length > 0) {
      console.error('Missing keys in EN (from BS):', extraInBs);
    }

    expect(missingInBs, `Keys missing in BS: ${JSON.stringify(missingInBs)}`).toEqual([]);
    expect(extraInBs, `Keys missing in EN (from BS): ${JSON.stringify(extraInBs)}`).toEqual([]);
  });
});
