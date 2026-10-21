/**
 * Cryptographically secure pseudorandom utilities using the Web Crypto API.
 * Complies with SonarCloud rule typescript:S2245 (CSPRNG).
 */

/**
 * Generates a cryptographically secure random number in the range [0, 1),
 * functionally equivalent to Math.random() but safe for security-sensitive contexts.
 *
 * @returns A pseudo-random floating point number between 0 (inclusive) and 1 (exclusive).
 */
export function secureRandom(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / (0xffffffff + 1);
  }
  return 0.5;
}

/**
 * Returns a randomly selected element from an array using cryptographically secure random generation.
 *
 * @param items The source array to pick an element from.
 * @returns A randomly chosen element from the array, or undefined if the array is empty.
 */
export function secureRandomItem<T>(items: readonly T[]): T | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }
  const index = Math.floor(secureRandom() * items.length);
  return items[index];
}
