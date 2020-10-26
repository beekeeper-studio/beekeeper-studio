import Knex from 'knex'

export const dbtimeout = 120000

export async function setupdb(knex: Knex, connection: any) {
  const query = knex.schema.createTableIfNotExists("people", (table) => {
    table.increments()
    table.timestamps()
    table.string("firstname")
    table.string("lastname")
    table.string("email").notNullable()
  }).toQuery()  
  await connection.executeQuery(query)
  knex("people").insert({ email: "foo@bar.com"})
}

export async function dropdb(knex: Knex, connection: any) {
  
}

export async function testdb(knex: Knex, connection: any) {
  const tables = await connection.listTables("public")
  expect(tables.length).toBe(1)
  const columns = await connection.listTableColumns("people", "public")
  expect(columns.length).toBe(6)
}