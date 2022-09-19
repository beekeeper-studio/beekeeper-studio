

import a from './20200101'
import b from './20200422'
import c from './20200514'
import d from './20200517'
import createSettings from './20200624_create_settings'
import addZoom from './20200703_add_zoom_to_settings'
import addSc from './20200707-add-sc-to-used-connections'
import dev1 from './dev-1'
import dev2 from './dev-2'
import domains from './20200519'
import encrypt from './20200917-encrypt-passwords'
import sslFiles from './20201008-add-ssl-files'
import sslReject from './20201231-ssl-reject-unauthorized'
import pinned from './20210713_create_pins'
import addSort from './20210811_add_sort_to_settings'
import createCreds from './20210927_create_cloud_credentials'
import workspaceScoping from './20211007_workspace_scoping'
import workspace2 from './20211015_workspace_used_query'
import addTabs from './20211220-create_opentabs'
import scWorkspace from './20211227_add_workspaceId_to_saved_connections'
import createLogger from '../lib/logger'
import systemTheme from './20220307-default-theme-system'
import serverCerts from './20220401_add_trust_server_certificate_to_connections'
import socketPath from './20220408_add_socket_path'
import connectionOptions from './20220426_connection_options'
import keepaliveInterval from './20220709_add_keepalive_interval'
import redshiftOptions from './20220817_add_redshift_options'


const logger = createLogger('migrations')()

const setupSQL = `
 CREATE TABLE IF NOT EXISTS BK_MIGRATIONS(
   name VARCHAR(255) PRIMARY KEY NOT NULL,
   run_at datetime NOT NULL DEFAULT (datetime('now'))
 )
`
const realMigrations = [
  a, b, c, d, domains, createSettings, addZoom,
  addSc, sslFiles, sslReject, pinned, addSort,
  createCreds, workspaceScoping, workspace2, addTabs, scWorkspace, systemTheme,
  serverCerts, socketPath, connectionOptions, keepaliveInterval, redshiftOptions
]

// fixtures require the models
const fixtures = [
  encrypt
]

const devMigrations = [
  dev1, dev2
]

const migrations = [...realMigrations, ...fixtures, ...devMigrations]

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
  constructor(connection, env) {
    this.connection = connection
    this.env = env
  }

  async run() {
    console.log("running migrations")
    const runner = this.connection.connection.createQueryRunner()
    await runner.query(setupSQL)
    for(let i = 0; i < migrations.length; i++){
      const migration = migrations[i]
      logger.debug(`Checking migration ${migration.name}`)
      if(migration.env && migration.env !== this.env) {
        // env defined, and does not match
        logger.debug(`Skipping ${migration.name} in ${this.env}, required ${migration.env} `)
        continue
      }
      const hasRun = await Manager.checkExists(runner, migration.name)
      if (!hasRun) {
        await migration.run(runner, this.env)
        await Manager.markExists(runner, migration.name)
      }
    }
  }

}
