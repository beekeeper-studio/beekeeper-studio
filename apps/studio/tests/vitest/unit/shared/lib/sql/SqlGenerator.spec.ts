import { describe, test, expect } from "vitest"
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator"
import { Schema } from "@shared/lib/dialects/models"

function buildSql(schema: Schema): string {
  const generator = new SqlGenerator('mysql', { dbConfig: {}, dbName: 'test' })
  return generator.buildSql(schema)
}

describe("SqlGenerator (MySQL, MariaDB and TiDB)", () => {
  // TiDB can't add AUTO_INCREMENT to an existing column, so it has to be in
  // the create table, never in a later `alter table ... modify column`.
  test("declares an auto increment primary key in the create table", () => {
    const sql = buildSql({
      name: 'users',
      columns: [
        { columnName: 'id', dataType: 'autoincrement', primaryKey: true, nullable: false },
        { columnName: 'name', dataType: 'varchar(255)', nullable: true },
      ],
    })
    expect(sql).toBe(
      "create table `users` (`id` int unsigned not null auto_increment, `name` varchar(255) null, primary key (`id`))"
    )
  })

  test("keeps the auto increment column's comment", () => {
    const sql = buildSql({
      name: 'users',
      columns: [
        { columnName: 'id', dataType: 'autoincrement', primaryKey: true, nullable: false, comment: 'Row id' },
      ],
    })
    expect(sql).toBe(
      "create table `users` (`id` int unsigned not null auto_increment comment 'Row id', primary key (`id`))"
    )
  })

  test("puts an auto increment column in the primary key when it isn't marked as one", () => {
    const sql = buildSql({
      name: 'users',
      columns: [
        { columnName: 'id', dataType: 'autoincrement', primaryKey: false, nullable: false },
        { columnName: 'tenant_id', dataType: 'int', primaryKey: true, nullable: false },
      ],
    })
    expect(sql).toBe(
      "create table `users` (`id` int unsigned not null auto_increment, `tenant_id` int not null, primary key (`id`, `tenant_id`))"
    )
  })
})
