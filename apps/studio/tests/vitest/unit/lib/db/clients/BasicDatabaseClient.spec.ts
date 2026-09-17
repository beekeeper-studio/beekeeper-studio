import { describe, it, expect, beforeEach } from "vitest";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";

class TestClient extends (BasicDatabaseClient as any) {
  constructor() {
    super(null, null, null, null);
  }

  public testAnnotateQueryError(error: any, queryIndex: number, totalQueries: number): any {
    return this.annotateQueryError(error, queryIndex, totalQueries);
  }
}

describe('BasicDatabaseClient', () => {
  describe('annotateQueryError', () => {
    let client: TestClient;

    beforeEach(() => {
      client = new TestClient();
    });

    it('should leave error message unchanged for single query execution', () => {
      const err = new Error('Syntax error at row 1');
      const result = client.testAnnotateQueryError(err, 0, 1);
      expect(result.message).toBe('Syntax error at row 1');
    });

    it('should format first query failure as (@ query #1)', () => {
      const err = new Error('Data truncated for column name');
      const result = client.testAnnotateQueryError(err, 0, 3);
      expect(result.message).toBe('Data truncated for column name (@ query #1)');
    });

    it('should format middle query failure as (@ query #2)', () => {
      const err = new Error('Table users does not exist');
      const result = client.testAnnotateQueryError(err, 1, 3);
      expect(result.message).toBe('Table users does not exist (@ query #2)');
    });

    it('should format last query failure as (@ query #3)', () => {
      const err = new Error('Division by zero');
      const result = client.testAnnotateQueryError(err, 2, 3);
      expect(result.message).toBe('Division by zero (@ query #3)');
    });

    it('should preserve original error object properties and prototype', () => {
      class CustomDriverError extends Error {
        code = 'ERR_CUSTOM';
        position = 42;
      }
      const err = new CustomDriverError('Custom failure');
      const result = client.testAnnotateQueryError(err, 1, 2);
      expect(result).toBe(err);
      expect(result.code).toBe('ERR_CUSTOM');
      expect(result.position).toBe(42);
      expect(result.message).toBe('Custom failure (@ query #2)');
    });

    it('should be idempotent and avoid duplicate query annotations', () => {
      const err = new Error('Syntax error');
      client.testAnnotateQueryError(err, 0, 2);
      client.testAnnotateQueryError(err, 0, 2);
      expect(err.message).toBe('Syntax error (@ query #1)');
    });
  });
});
