import Knex from 'knex'
import { tableStatements } from './db/tables'


export const dbtimeout = 120000

export class DBTestUtil {
  private knex: Knex
  private connection: any
  private tables: string[]
  constructor(knex: Knex, connection: any) {
    this.knex = knex
    this.connection = connection
    this.tables = tableStatements(this.knex)
  }

  async setupdb() {
    await this.connection.executeQuery(this.tables.join(";"))
    await this.connection.executeQuery(this.knex("people").insert({ email: "foo@bar.com"}).toQuery())
  }

  async testdb() {
    const tables = await this.connection.listTables("public")
    expect(tables.length).toBe(this.tables.length)
    const columns = await this.connection.listTableColumns("people", "public")
    expect(columns.length).toBe(6)  
  }
}