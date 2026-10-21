import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import addProductionFlag from "@/migration/20261015_add_production_flag";

describe("20261015-add-production-flag", () => {
  it("adds isProduction to both connection tables, off for existing rows", async () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE saved_connection (id integer primary key, name varchar)");
    db.exec("CREATE TABLE used_connection (id integer primary key, name varchar)");
    db.exec("INSERT INTO saved_connection (name) VALUES ('existing')");
    db.exec("INSERT INTO used_connection (name) VALUES ('existing')");

    await addProductionFlag.run({ query: async (sql: string) => db.exec(sql) });

    expect(db.prepare("SELECT isProduction FROM saved_connection").get()).toEqual({ isProduction: 0 });
    expect(db.prepare("SELECT isProduction FROM used_connection").get()).toEqual({ isProduction: 0 });
    db.close();
  });
});
