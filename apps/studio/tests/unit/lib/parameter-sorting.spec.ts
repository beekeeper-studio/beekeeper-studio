/**
 * Unit tests for parameter sorting utilities
 */

import {
  sortParameters,
  sortParametersAlphanumeric,
  deduplicatePreservingOrder,
  ParameterSortMode,
} from '@/lib/db/parameter-sorting';

describe('Parameter Sorting Utilities', () => {
  describe('deduplicatePreservingOrder', () => {
    it('removes duplicates while preserving insertion order', () => {
      const params = [':1', ':10', ':2', ':10', ':11', ':1', ':3'];
      const result = deduplicatePreservingOrder(params);

      expect(result).toEqual([':1', ':10', ':2', ':11', ':3']);
    });

    it('handles empty array', () => {
      expect(deduplicatePreservingOrder([])).toEqual([]);
    });

    it('handles array with no duplicates', () => {
      const params = [':1', ':2', ':3'];
      expect(deduplicatePreservingOrder(params)).toEqual([':1', ':2', ':3']);
    });

    it('handles numeric parameters from positional ? params', () => {
      const params = [0, 1, 2, 1, 0];
      const result = deduplicatePreservingOrder(params);

      expect(result).toEqual([0, 1, 2]);
    });
  });

  describe('sortParametersAlphanumeric', () => {
    describe('numeric parameter sorting', () => {
      it('sorts numeric parameters correctly for :N syntax', () => {
        const params = [':1', ':10', ':2', ':11', ':3'];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual([':1', ':2', ':3', ':10', ':11']);
      });

      it('sorts numeric parameters correctly for $N syntax (PostgreSQL)', () => {
        const params = ['$5', '$10', '$1', '$20', '$2'];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual(['$1', '$2', '$5', '$10', '$20']);
      });

      it('sorts numeric parameters correctly for @N syntax (SQL Server)', () => {
        const params = ['@10', '@2', '@1', '@20'];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual(['@1', '@2', '@10', '@20']);
      });

      it('handles large numeric indices correctly', () => {
        const params = [':100', ':50', ':200', ':1', ':25'];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual([':1', ':25', ':50', ':100', ':200']);
      });

      it('handles single-digit and multi-digit numbers mixed', () => {
        const params = [':1', ':2', ':3', ':4', ':5', ':6', ':7', ':8', ':9', ':10', ':11', ':12'];
        const result = sortParametersAlphanumeric(params);

        // Should be in numeric order, not alphabetic
        expect(result).toEqual([':1', ':2', ':3', ':4', ':5', ':6', ':7', ':8', ':9', ':10', ':11', ':12']);
      });
    });

    describe('named parameter sorting', () => {
      it('sorts named parameters alphabetically', () => {
        const params = [':name', ':age', ':status', ':id', ':email'];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual([':age', ':email', ':id', ':name', ':status']);
      });

      it('sorts named parameters with same prefix', () => {
        const params = [':param_z', ':param_a', ':param_m'];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual([':param_a', ':param_m', ':param_z']);
      });
    });

    describe('mixed parameter sorting', () => {
      it('sorts numeric parameters before named parameters with same prefix', () => {
        const params = [':name', ':1', ':2', ':id'];
        const result = sortParametersAlphanumeric(params);

        // Numeric suffixed params should come before named params
        expect(result).toEqual([':1', ':2', ':id', ':name']);
      });

      it('handles mix of different prefixes and numeric/named params', () => {
        const params = ['$10', ':name', '$1', ':2', '@param'];
        const result = sortParametersAlphanumeric(params);

        // Should sort alphanumerically when prefixes differ
        // All params should be present and sorted
        expect(result).toHaveLength(5);
        expect(result).toContain('$1');
        expect(result).toContain('$10');
        expect(result).toContain(':2');
        expect(result).toContain(':name');
        expect(result).toContain('@param');
      });
    });

    describe('positional numeric parameters', () => {
      it('sorts plain numeric parameters (from ? placeholders)', () => {
        const params = [5, 1, 10, 2, 20];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual([1, 2, 5, 10, 20]);
      });

      it('places numeric parameters before string parameters', () => {
        const params = [':name', 2, ':id', 1, 3];
        const result = sortParametersAlphanumeric(params);

        // Numbers should come first
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe(3);
      });
    });

    describe('edge cases', () => {
      it('handles empty array', () => {
        expect(sortParametersAlphanumeric([])).toEqual([]);
      });

      it('handles single parameter', () => {
        expect(sortParametersAlphanumeric([':1'])).toEqual([':1']);
      });

      it('handles parameters with zero padding', () => {
        const params = [':001', ':010', ':002'];
        const result = sortParametersAlphanumeric(params);

        // Should sort numerically based on the number value
        expect(result).toEqual([':001', ':002', ':010']);
      });

      it('handles parameters without numeric suffixes', () => {
        const params = ['@param', '$value', ':name'];
        const result = sortParametersAlphanumeric(params);

        // Should sort alphabetically using localeCompare
        expect(result).toEqual([':name', '@param', '$value']);
      });

      it('preserves array when already sorted', () => {
        const params = [':1', ':2', ':3', ':10', ':11'];
        const result = sortParametersAlphanumeric(params);

        expect(result).toEqual([':1', ':2', ':3', ':10', ':11']);
      });
    });
  });

  describe('sortParameters (main function)', () => {
    const testParams = [':1', ':10', ':2', ':11', ':3', ':1', ':2'];

    describe('insertion mode (default)', () => {
      it('preserves insertion order when mode is "insertion"', () => {
        const result = sortParameters(testParams, 'insertion');

        // Should deduplicate and preserve order
        expect(result).toEqual([':1', ':10', ':2', ':11', ':3']);
      });

      it('preserves insertion order when mode is not specified', () => {
        const result = sortParameters(testParams);

        expect(result).toEqual([':1', ':10', ':2', ':11', ':3']);
      });

      it('handles edge case: empty array', () => {
        expect(sortParameters([], 'insertion')).toEqual([]);
      });
    });

    describe('alphanumeric mode', () => {
      it('sorts alphanumerically when mode is "alphanumeric"', () => {
        const result = sortParameters(testParams, 'alphanumeric');

        // Should deduplicate and sort numerically
        expect(result).toEqual([':1', ':2', ':3', ':10', ':11']);
      });

      it('handles named parameters in alphanumeric mode', () => {
        const params = [':name', ':age', ':id', ':name'];
        const result = sortParameters(params, 'alphanumeric');

        expect(result).toEqual([':age', ':id', ':name']);
      });

      it('handles mixed parameters in alphanumeric mode', () => {
        const params = ['$10', ':name', '$1', ':2', ':10'];
        const result = sortParameters(params, 'alphanumeric');

        // Should sort with smart numeric handling
        expect(result).toHaveLength(5);
        expect(result).toContain('$1');
        expect(result).toContain('$10');
        expect(result).toContain(':2');
        expect(result).toContain(':10');
        expect(result).toContain(':name');
      });

      it('handles edge case: empty array', () => {
        expect(sortParameters([], 'alphanumeric')).toEqual([]);
      });
    });

    describe('mode comparison', () => {
      it('produces different results for insertion vs alphanumeric modes', () => {
        const params = [':10', ':1', ':2', ':20'];

        const insertionResult = sortParameters(params, 'insertion');
        const alphanumericResult = sortParameters(params, 'alphanumeric');

        expect(insertionResult).toEqual([':10', ':1', ':2', ':20']);
        expect(alphanumericResult).toEqual([':1', ':2', ':10', ':20']);
        expect(insertionResult).not.toEqual(alphanumericResult);
      });
    });

    describe('real-world scenarios', () => {
      it('handles PostgreSQL query with 15 parameters', () => {
        const params = [
          '$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9', '$10', '$11', '$12', '$13', '$14', '$15'
        ];

        const insertionResult = sortParameters(params, 'insertion');
        const alphanumericResult = sortParameters(params, 'alphanumeric');

        // Both should maintain numeric order since they're already in order
        expect(insertionResult).toEqual(params);
        expect(alphanumericResult).toEqual(params);
      });

      it('handles Oracle query with out-of-order parameters', () => {
        const params = [':1', ':10', ':2', ':11', ':3', ':4', ':5', ':6', ':7', ':8', ':9'];

        const insertionResult = sortParameters(params, 'insertion');
        const alphanumericResult = sortParameters(params, 'alphanumeric');

        // Insertion: preserves the order
        expect(insertionResult).toEqual([':1', ':10', ':2', ':11', ':3', ':4', ':5', ':6', ':7', ':8', ':9']);

        // Alphanumeric: sorts numerically
        expect(alphanumericResult).toEqual([':1', ':2', ':3', ':4', ':5', ':6', ':7', ':8', ':9', ':10', ':11']);
      });

      it('handles named parameters in different orders', () => {
        const params = [':userId', ':email', ':firstName', ':lastName', ':age'];

        const insertionResult = sortParameters(params, 'insertion');
        const alphanumericResult = sortParameters(params, 'alphanumeric');

        // Insertion: preserves order
        expect(insertionResult).toEqual([':userId', ':email', ':firstName', ':lastName', ':age']);

        // Alphanumeric: sorts alphabetically
        expect(alphanumericResult).toEqual([':age', ':email', ':firstName', ':lastName', ':userId']);
      });

      it('handles query with duplicate parameters', () => {
        const params = [':id', ':name', ':id', ':age', ':name', ':status'];

        const insertionResult = sortParameters(params, 'insertion');
        const alphanumericResult = sortParameters(params, 'alphanumeric');

        // Both should remove duplicates
        expect(insertionResult).toHaveLength(4);
        expect(alphanumericResult).toHaveLength(4);

        // Insertion: first occurrence order
        expect(insertionResult).toEqual([':id', ':name', ':age', ':status']);

        // Alphanumeric: sorted
        expect(alphanumericResult).toEqual([':age', ':id', ':name', ':status']);
      });
    });
  });
});
