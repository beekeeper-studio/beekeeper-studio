import { describe, it, expect } from "vitest";
import { buildSelectTopQuery as buildDuckDBSelectTopQuery } from "@commercial/backend/lib/db/clients/duckdb";
import { FirebirdClient } from "@commercial/backend/lib/db/clients/firebird";
import { CassandraClient } from "@commercial/backend/lib/db/clients/cassandra";

// "SQL: Select Top" passes the table's column names as `selects`, so each
// client has to quote them like any other identifier.
const columns = ["id", "UserName", "first name"];

describe("select top column quoting", () => {
  describe("DuckDB", () => {
    it("quotes selected columns", () => {
      const { query } = buildDuckDBSelectTopQuery("cheeses", 0, 100, [], [], "main", "total", [], columns);
      expect(query).toContain('SELECT "id", "UserName", "first name"');
    });

    it("leaves * unquoted", () => {
      const { query } = buildDuckDBSelectTopQuery("cheeses", 0, 100, [], [], "main");
      expect(query).toContain("SELECT *");
    });
  });

  describe("Firebird", () => {
    it("quotes selected columns that need it", () => {
      const { query } = FirebirdClient.buildSelectTopQuery("CHEESES", 0, 100, [], [], "total", columns);
      expect(query).toContain('id, UserName, "first name"');
    });

    it("leaves * unquoted", () => {
      const { query } = FirebirdClient.buildSelectTopQuery("CHEESES", 0, 100, [], []);
      expect(query).toMatch(/SKIP 0\s+\*\s+FROM/);
    });
  });

  describe("Cassandra", () => {
    // buildSelectTopQueries is private and only needs the prototype methods,
    // so call it on a bare instance instead of connecting.
    const build = (selects?: string[]) => {
      const client = Object.create(CassandraClient.prototype);
      return client.buildSelectTopQueries({ table: "cheeses", schema: "bks", filters: [], selects }).query;
    };

    it("quotes selected columns", () => {
      expect(build(columns)).toContain('SELECT "id", "UserName", "first name"');
    });

    it("leaves * unquoted", () => {
      expect(build()).toContain("SELECT *");
    });
  });
});
