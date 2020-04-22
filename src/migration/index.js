
import a from './20200101'
import b from './20200422'

const setupSQL = `
 CREATE TABLE IF NOT EXISTS BK_MIGRATIONS(
   name VARCHAR(255) PRIMARY KEY NOT NULL,
   run_at datetime NOT NULL DEFAULT (datetime('now'))
 )
`
const migrations = [
a, b
]

const Manager = {
  ceQuery: "select name from bk_migrations where name = ?",
  meQuery: "INSERT INTO bk_migrations(name) values (?)",

  async checkExists(runner, name) {
    const result = await runner.query(this.ceQuery, [name])
    return result.length > 0
  },
  async markExists(runner, name) {
    const result = await runner.query(this.meQuery, [name])
    return !!result
  }
}


export default class {
  constructor(connection) {
    this.connection = connection
  }

  async run() {
    console.log("running migrations")
    const runner = this.connection.createQueryRunner()
    await runner.query(setupSQL)
    try  {
      // await runner.startTransaction()
      for(let i = 0; i < migrations.length; i++){
        const migration = migrations[i]
        console.log(`Checking migration ${migration.name}`)
        const hasRun = await Manager.checkExists(runner, migration.name)
        if (!hasRun) {
          await migration.run(runner)
          await Manager.markExists(runner, migration.name)
        }
      }
      // await runner.commitTransaction()
    } catch (e) {
      // await runner.rollbackTransaction()
      throw e
    } finally {
      // await runner.release()
    }
  }

}