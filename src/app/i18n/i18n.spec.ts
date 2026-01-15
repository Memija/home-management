import { describe, it, expect } from 'vitest';
import { en } from './en';
import { de } from './de';

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
  it('should have the same keys for en and de', () => {
    const enKeys = getKeys(en).sort();
    const deKeys = getKeys(de).sort();

    // Check for keys in EN but missing in DE
    const missingInDe = enKeys.filter(key => !deKeys.includes(key));
    if (missingInDe.length > 0) {
      console.error('Missing keys in DE:', missingInDe);
    }

    // Check for keys in DE but missing in EN
    const missingInEn = deKeys.filter(key => !enKeys.includes(key));
    if (missingInEn.length > 0) {
      console.error('Missing keys in EN:', missingInEn);
    }

    expect(missingInDe, `Keys missing in DE: ${JSON.stringify(missingInDe)}`).toEqual([]);
    expect(missingInEn, `Keys missing in EN: ${JSON.stringify(missingInEn)}`).toEqual([]);
  });
});
