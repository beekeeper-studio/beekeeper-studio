import { extractVariablesAndCleanQuery, substituteVariables } from "@/common/utils";

describe("Inline Variables", () => {

  describe("extractVariablesAndCleanQuery", () => {
    it("extracts variables defined with line comments", () => {
      const query = `
        -- %limit% = 10
        -- %status% = 'active'
        SELECT * FROM users WHERE status = %status% LIMIT %limit%;
      `;

      const { variables, cleanedQuery } = extractVariablesAndCleanQuery(query);

      expect(variables).toEqual({
        limit: '10',
        status: "'active'",
      });

      expect(cleanedQuery).toContain("SELECT * FROM users");
      expect(cleanedQuery).not.toContain("-- %limit%");
    });

    it("extracts variables from VARS block", () => {
      const query = `
        /* VARS:
        %limit% = 20
        %status% = 'pending'
        */
        SELECT * FROM orders WHERE status = %status% LIMIT %limit%;
      `;

      const { variables } = extractVariablesAndCleanQuery(query);

      expect(variables).toEqual({
        limit: '20',
        status: "'pending'",
      });
    });

    it("throws error if line comment variable is malformed", () => {
      const query = `
        -- %limit% =
        SELECT * FROM users;
      `;

      expect(() => extractVariablesAndCleanQuery(query)).toThrow("Malformed variable");
    });

    it("throws error if block variable is malformed", () => {
      const query = `
        /* VARS:
        %limit% =
        */
        SELECT * FROM users;
      `;

      expect(() => extractVariablesAndCleanQuery(query)).toThrow("Malformed variable");
    });
  });

  describe("substituteVariables", () => {
    it("substitutes variables correctly", () => {
      const query = "SELECT * FROM users WHERE status = %status% LIMIT %limit%;";
      const variables = {
        status: "'active'",
        limit: "10",
      };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM users WHERE status = 'active' LIMIT 10;");
    });

    it("adds quotes if missing", () => {
      const query = "SELECT * FROM products WHERE category = %category%;";
      const variables = { category: "books" };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM products WHERE category = 'books';");
    });

    it("keeps valid JSON values as-is", () => {
      const query = "SELECT * FROM data WHERE payload = %payload%;";
      const variables = { payload: '{"key": "value"}' };

      const result = substituteVariables(query, variables);
      expect(result).toBe(`SELECT * FROM data WHERE payload = {"key": "value"};`);
    });

    it("does not add quotes to valid SQL lists", () => {
      const query = "SELECT * FROM users WHERE id IN %ids%;";
      const variables = { ids: "(1, 2, 3)" };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM users WHERE id IN (1, 2, 3);");
    });

    it("substitutes multiple occurrences of the same variable", () => {
      const query = "SELECT * FROM logs WHERE user_id = %id% OR actor_id = %id%;";
      const variables = { id: "42" };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM logs WHERE user_id = 42 OR actor_id = 42;");
    });

    it("keeps null without quotes", () => {
      const query = "SELECT * FROM users WHERE deleted_at IS %deleted%;";
      const variables = { deleted: "null" };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM users WHERE deleted_at IS null;");
    });

    it("adds quotes to strings with spaces", () => {
      const query = "SELECT * FROM books WHERE title = %title%;";
      const variables = { title: "Harry Potter" };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM books WHERE title = 'Harry Potter';");
    });

    it("does not add quotes to floats and negative numbers", () => {
      const query = "SELECT * FROM readings WHERE value > %min% AND value < %max%;";
      const variables = { min: "-5.5", max: "42.0" };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM readings WHERE value > -5.5 AND value < 42.0;");
    });

    it("ignores variables that are not used in the query", () => {
      const query = "SELECT * FROM products;";
      const variables = { price: "100" };

      const result = substituteVariables(query, variables);
      expect(result).toBe("SELECT * FROM products;");
    });
  });

  describe("Edge cases", () => {
    it("should not replace variables inside SQL string literals", () => {
      const inputQuery = `
        -- %id% = 7

        SELECT * FROM test_table
        WHERE id = %id%
        AND name LIKE '%id%';
      `;

      const { variables, cleanedQuery } = extractVariablesAndCleanQuery(inputQuery);
      const substituted = substituteVariables(cleanedQuery, variables);

      expect(substituted).toContain(`id = 7`);
      expect(substituted).toContain(`LIKE '%id%'`); // Should remain untouched
      expect(substituted).not.toContain(`LIKE '7'`);
    });
  });

});

describe('Variable substitution across dialects', () => {
  const inputSQL = `
-- %name% = Alice
-- %age% = 42
-- %city% = Paris
-- %json% = {"foo": "bar"}
-- %list% = (1, 2, 3)
-- %number% = 123.45
-- %null_value% = null

SELECT
  'Hello %name%',
  'Age is %age%',
  'JSON literal: %json%',
  'List literal: %list%',
  'Number literal: %number%',
  'Null literal: %null_value%',
  
  $$Dollar says %name%$$,

  "Hello %name%",

  %name% AS name_col,
  %age% AS age_col,
  %city% AS city_col,
  %json% AS json_col,
  %list% AS list_col,
  %number% AS number_col,
  %null_value% AS null_col;
`;

const expectedSQL = `
SELECT
  'Hello %name%',
  'Age is %age%',
  'JSON literal: %json%',
  'List literal: %list%',
  'Number literal: %number%',
  'Null literal: %null_value%',
  
  $$Dollar says 'Alice'$$,

  "Hello 'Alice'",

  'Alice' AS name_col,
  42 AS age_col,
  'Paris' AS city_col,
  {"foo": "bar"} AS json_col,
  (1, 2, 3) AS list_col,
  123.45 AS number_col,
  null AS null_col;
`.trim();


  const dialects = ['sqlite', 'bigquery', 'generic'];

  dialects.forEach(dialect => {
    test(`Dialect: ${dialect}`, () => {
      const { variables, cleanedQuery } = extractVariablesAndCleanQuery(inputSQL);
      const substituted = substituteVariables(cleanedQuery, variables, dialect);

      expect(substituted.trim()).toBe(expectedSQL);
    });
  });
});
