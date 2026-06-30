import { CassandraChangeBuilder } from "@shared/lib/sql/change_builder/CassandraChangeBuilder"

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
