/**
 * Parameter Sorting Utilities
 *
 * Provides functions to sort database query parameters in different modes.
 */

export type ParameterSortMode = 'insertion' | 'alphanumeric';

/**
 * Extracts the numeric suffix from a parameter string.
 * Examples: ':10' -> 10, '$5' -> 5, '@param3' -> 3, ':name' -> null
 */
function extractNumericSuffix(param: string | number): number | null {
  if (typeof param === 'number') return param;

  const match = param.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extracts the prefix from a parameter string.
 * Examples: ':10' -> ':', '$5' -> '$', '@param' -> '@param', ':name' -> ':name'
 */
function extractPrefix(param: string | number): string {
  if (typeof param === 'number') return '';

  const match = param.match(/^(.+?)(\d+)$/);
  return match ? match[1] : param;
}

/**
 * Compares two parameters for alphanumeric sorting.
 * Handles numeric suffixes intelligently (e.g., :1, :2, :10 instead of :1, :10, :2)
 */
function compareParameters(a: string | number, b: string | number): number {
  // Handle numeric parameters (from positional ? params)
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;

  const prefixA = extractPrefix(a);
  const prefixB = extractPrefix(b);
  const numA = extractNumericSuffix(a);
  const numB = extractNumericSuffix(b);

  // If both have the same prefix
  if (prefixA === prefixB) {
    // If both have numeric suffixes, compare numerically
    if (numA !== null && numB !== null) {
      return numA - numB;
    }
    // If only one has a numeric suffix, put numeric ones first
    if (numA !== null) return -1;
    if (numB !== null) return 1;
  }

  // Different prefixes or no numeric suffixes - compare as strings
  return a.toString().localeCompare(b.toString());
}

/**
 * Sorts parameters alphanumerically with smart numeric handling.
 *
 * Examples:
 * - [':1', ':10', ':2'] -> [':1', ':2', ':10']
 * - ['$5', '$10', '$1'] -> ['$1', '$5', '$10']
 * - [':name', ':age', ':id'] -> [':age', ':id', ':name']
 * - [':1', ':name', ':2'] -> [':1', ':2', ':name']
 */
export function sortParametersAlphanumeric(params: Array<string | number>): Array<string | number> {
  return [...params].sort(compareParameters);
}

/**
 * Removes duplicates while preserving insertion order.
 * This is the default behavior (no sorting).
 */
export function deduplicatePreservingOrder(params: Array<string | number>): Array<string | number> {
  return Array.from(new Set(params));
}

/**
 * Sorts and deduplicates parameters based on the specified mode.
 *
 * @param params - Array of parameter strings or numbers
 * @param mode - Sorting mode: 'insertion' (default) or 'alphanumeric'
 * @returns Deduplicated and sorted array based on mode
 */
export function sortParameters(
  params: Array<string | number>,
  mode: ParameterSortMode = 'insertion'
): Array<string | number> {
  // First deduplicate to preserve first occurrence
  const deduplicated = deduplicatePreservingOrder(params);

  // Then sort if alphanumeric mode
  if (mode === 'alphanumeric') {
    return sortParametersAlphanumeric(deduplicated);
  }

  return deduplicated;
}
