import { DuckDBChangeBuilder } from "@shared/lib/sql/change_builder/DuckDBChangeBuilder"

describe("DuckDBChangeBuilder", () => {
  describe("addColumn", () => {
    it("does not double-quote the data type", () => {
      const builder = new DuckDBChangeBuilder("my_table")
      const sql = builder.addColumn({
        columnName: "my_col",
        dataType: "INTEGER",
        nullable: false,
      })
      // data type must NOT be wrapped in quotes like "INTEGER"
      expect(sql).not.toContain('"INTEGER"')
      expect(sql).toContain("INTEGER")
    })

    it("generates valid ADD COLUMN syntax", () => {
      const builder = new DuckDBChangeBuilder("my_table")
      const sql = builder.alterTable({
        table: "my_table",
        adds: [{ columnName: "score", dataType: "DOUBLE", nullable: true }]
      })
      expect(sql).toContain("ADD COLUMN")
      expect(sql).toContain('"score"')
      expect(sql).toContain("DOUBLE")
      expect(sql).not.toContain('"DOUBLE"')
    })
  })
})
