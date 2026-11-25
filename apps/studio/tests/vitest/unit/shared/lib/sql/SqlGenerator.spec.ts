import { describe, it, expect } from "vitest"
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator"

describe("SqlGenerator", () => {
  describe("starrocks", () => {
    const generator = () => new SqlGenerator('starrocks', { dbConfig: {}, dbName: 'qa' } as any)

    it("should build a table with a table-level primary key and no unsigned or alter", () => {
      const sql = generator().buildSql({
        name: 't',
        columns: [
          { columnName: 'id', dataType: 'autoincrement', primaryKey: true, nullable: false },
          { columnName: 'created_at', dataType: 'varchar(255)', nullable: false },
        ],
      } as any)
      expect(sql).toBe(
        "create table `t` (`id` bigint not null auto_increment, `created_at` varchar(255) not null) primary key (`id`)"
      )
    })

    it("should build a table without a primary key", () => {
      const sql = generator().buildSql({
        name: 'imp',
        columns: [{ columnName: 'a', dataType: 'varchar(255)', nullable: true }],
      } as any)
      expect(sql).toBe("create table `imp` (`a` varchar(255) null)")
    })
  })
})
