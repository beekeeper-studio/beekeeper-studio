import { describe, it, expect, vi } from "vitest";
import type * as cassandra from "cassandra-driver"
import { CassandraChangeBuilder } from "@shared/lib/sql/change_builder/CassandraChangeBuilder"
import { CassandraClient } from "@commercial/backend/lib/db/clients/cassandra"
import type { IDbConnectionServer } from "@/lib/db/backendTypes"
import type { IDbConnectionDatabase } from "@/lib/db/types"

describe("CassandraChangeBuilder", () => {
  describe("alterTable - column rename", () => {
    it("generates RENAME SQL for a clustering column rename", () => {
      const builder = new CassandraChangeBuilder("my_table", [])
      const sql = builder.alterTable({
        table: "my_table",
        adds: [],
        drops: [],
        alterations: [
          { columnName: "old_col", changeType: "columnName", newValue: "new_col" }
        ]
      })
      expect(sql).not.toBeNull()
      expect(sql).toContain("RENAME")
      expect(sql).toContain('"old_col"')
      expect(sql).toContain('"new_col"')
    })

    it("does not silently drop multiple column renames", () => {
      const builder = new CassandraChangeBuilder("my_table", [])
      const sql = builder.alterTable({
        table: "my_table",
        adds: [],
        drops: [],
        alterations: [
          { columnName: "col_a", changeType: "columnName", newValue: "col_a_new" },
          { columnName: "col_b", changeType: "columnName", newValue: "col_b_new" },
        ]
      })
      expect(sql).not.toBeNull()
      expect(sql).toContain('"col_a"')
      expect(sql).toContain('"col_a_new"')
      expect(sql).toContain('"col_b"')
      expect(sql).toContain('"col_b_new"')
    })
  })
})

describe("CassandraClient.alterTable", () => {
  function createClient() {
    const client = new CassandraClient(
      { config: { readOnlyMode: false } } as unknown as IDbConnectionServer,
      { database: "ks" } as IDbConnectionDatabase
    )
    const execute = vi.fn().mockResolvedValue({ rowLength: 0, columns: [], rows: [] })
    client.client = { execute } as unknown as cassandra.Client
    vi.spyOn(client, "getBuilder").mockReturnValue(new CassandraChangeBuilder("qa_items", []))
    return { client, execute }
  }

  it("sends each ALTER TABLE statement to the driver on its own", async () => {
    const { client, execute } = createClient()

    await client.alterTable({
      table: "qa_items",
      adds: [
        { columnName: "column_3", dataType: "varchar" },
        { columnName: "column_4", dataType: "varchar" },
      ],
      drops: ["column_2"],
      alterations: [],
    })

    const sent = execute.mock.calls.map(([query]) => query.trim())
    expect(sent).toHaveLength(3)
    sent.forEach((query) => expect(query.match(/ALTER TABLE/g)).toHaveLength(1))
    expect(sent[0]).toContain('ADD "column_3"')
    expect(sent[1]).toContain('ADD "column_4"')
    expect(sent[2]).toContain('DROP "column_2"')
  })

  it("keeps a single statement as one driver call", async () => {
    const { client, execute } = createClient()

    await client.alterTable({
      table: "qa_items",
      adds: [{ columnName: "column_3", dataType: "varchar" }],
      drops: [],
      alterations: [],
    })

    expect(execute).toHaveBeenCalledTimes(1)
  })
})
