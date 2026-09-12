import { describe, it, expect } from "vitest"
import { PostgresqlChangeBuilder } from "@shared/lib/sql/change_builder/PostgresqlChangeBuilder"

describe("PostgresqlChangeBuilder policies", () => {
  const builder = () => new PostgresqlChangeBuilder("orders", "public")

  describe("alterPolicy", () => {
    it("qualifies the table and quotes the policy name", () => {
      const sql = builder().alterPolicy({ name: "tenant_isolation", using: "tenant_id = 1" })
      expect(sql).toBe(
        `ALTER POLICY "tenant_isolation" ON "public"."orders" USING (tenant_id = 1)`
      )
    })

    it("renames in its own statement, then uses the new name", () => {
      const sql = builder().alterPolicy({
        name: "old_name",
        newName: "new_name",
        using: "true",
      })
      expect(sql).toBe(
        `ALTER POLICY "old_name" ON "public"."orders" RENAME TO "new_name";` +
        `ALTER POLICY "new_name" ON "public"."orders" USING (true)`
      )
    })

    it("emits only the rename when nothing else changed", () => {
      const sql = builder().alterPolicy({ name: "old_name", newName: "new_name" })
      expect(sql).toBe(`ALTER POLICY "old_name" ON "public"."orders" RENAME TO "new_name"`)
    })

    it("returns null when there is nothing to change", () => {
      expect(builder().alterPolicy({ name: "unchanged" })).toBeNull()
      expect(builder().alterPolicy({ name: "unchanged", newName: "unchanged" })).toBeNull()
    })

    it("quotes role names but leaves role keywords alone", () => {
      const sql = builder().alterPolicy({
        name: "p",
        roles: ["public", "Reporting Team", "current_user"],
      })
      expect(sql).toBe(
        `ALTER POLICY "p" ON "public"."orders" TO PUBLIC, "Reporting Team", CURRENT_USER`
      )
    })

    it("puts every clause on one statement", () => {
      const sql = builder().alterPolicy({
        name: "p",
        roles: ["app_user"],
        using: "owner = current_user",
        check: "owner = current_user",
      })
      expect(sql).toBe(
        `ALTER POLICY "p" ON "public"."orders" TO "app_user" ` +
        `USING (owner = current_user) WITH CHECK (owner = current_user)`
      )
    })

    it("strips semicolons out of expressions so they can't add statements", () => {
      const sql = builder().alterPolicy({
        name: "p",
        using: "true; DROP TABLE orders",
      })
      expect(sql).toBe(
        `ALTER POLICY "p" ON "public"."orders" USING (true DROP TABLE orders)`
      )
    })

    it("escapes quotes in identifiers", () => {
      const sql = builder().alterPolicy({ name: 'we"ird', roles: ['ro"le'] })
      expect(sql).toBe(`ALTER POLICY "we""ird" ON "public"."orders" TO "ro""le"`)
    })

    it("works without a schema", () => {
      const sql = new PostgresqlChangeBuilder("orders").alterPolicy({
        name: "p",
        using: "true",
      })
      expect(sql).toBe(`ALTER POLICY "p" ON "orders" USING (true)`)
    })
  })

  describe("alterPolicies", () => {
    it("joins statements and drops the no-ops", () => {
      const sql = builder().alterPolicies([
        { name: "a", using: "true" },
        { name: "b" },
        { name: "c", check: "false" },
      ])
      expect(sql).toBe(
        `ALTER POLICY "a" ON "public"."orders" USING (true);` +
        `ALTER POLICY "c" ON "public"."orders" WITH CHECK (false)`
      )
    })

    it("returns null when given nothing", () => {
      expect(builder().alterPolicies([])).toBeNull()
      expect(builder().alterPolicies(undefined)).toBeNull()
    })
  })

  describe("dropPolicies", () => {
    it("drops each policy by name", () => {
      const sql = builder().dropPolicies([{ name: "a" }, { name: "b" }])
      expect(sql).toBe(
        `DROP POLICY "a" ON "public"."orders";DROP POLICY "b" ON "public"."orders"`
      )
    })

    it("returns null when given nothing", () => {
      expect(builder().dropPolicies([])).toBeNull()
      expect(builder().dropPolicies(undefined)).toBeNull()
    })
  })
})
