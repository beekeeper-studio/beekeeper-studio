import { describe, it, expect } from "vitest";
import { RedshiftClient } from "@/lib/db/clients/redshift";

describe("Redshift rename SQL", () => {
  const client = new RedshiftClient(null, null);

  it("qualifies a table or view rename with the selected schema", async () => {
    await expect(client.setElementNameSql("orders", "purchases", "TABLE", "sales"))
      .resolves.toBe('ALTER TABLE "sales"."orders" RENAME TO "purchases";');
    await expect(client.setElementNameSql("orders", "purchases", "VIEW", "sales"))
      .resolves.toBe('ALTER TABLE "sales"."orders" RENAME TO "purchases";');
    await expect(client.setElementNameSql("sales", "billing", "SCHEMA", "sales"))
      .resolves.toBe('ALTER SCHEMA "sales" RENAME TO "billing";');
  });
});
