import a from './20200101'
import b from './20200422'
import c from './20200514'
import d from './20200517'
import createSettings from './20200624_create_settings'
import addZoom from './20200703_add_zoom_to_settings'
import addSc from './20200707-add-sc-to-used-connections'
import dev1 from './dev-1'
import dev2 from './dev-2'
import dev3 from './dev-3'
import dev4 from './dev-4'
import dev5 from './dev-5'
import dev6 from './dev-6'
import dev7 from './dev-7'
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
import systemTheme from './20220307-default-theme-system'
import serverCerts from './20220401_add_trust_server_certificate_to_connections'
import socketPath from './20220408_add_socket_path'
import connectionOptions from './20220426_connection_options'
import keepaliveInterval from './20220709_add_keepalive_interval'
import createHiddenEntities from './20220907_create_hidden_entities'
import createHiddenSchemas from './20220908_create_hidden_schemas'
import redshiftOptions from './20220817_add_redshift_options'
import cassandraOptions from './20221120_add_cassandra_options'
import readOnlyMode from './20221103_add_read_only'
import connectionPins from './20230308_create_connection_pins'
import fixKeymapType from './20230619_fix_keymap_type'
import bigQueryOptions from './20230426_add_bigquery_options'
import firebirdConnection from './20240107_add_firebird_dev_connection'
import exportPath from './20240122_add_default_export_path'
import demoSetup from './20240421_seed_with_demo_data'
import tokenCache from './20240430_add_token_cache'
import minimalMode from './20240514_user_settings_minimal_mode'
import libsqlOptions from './20240528_add_libsql_options'
import nameTokenCache from './20240715_add_name_to_token_cache'
import maxAllowedAppRelease from './20240920_add_max_allowed_app_release'
import lastUsedWorkspace from './20240923_user_settings_default_workspace'
import userSettingKeymap from './20241017_add_user_setting_keymap'
import missingUserSettings from './20241017_add_missing_user_settings'
import useBeta from './20241009_add_beta_toggle'
import deleteDuplicateConnections from './20241115_delete_duplicate_connections'
import addNewUrlField from './20250128_add_new_url_field'

import ultimate from './ultimate/index'

import UserSettingsWindowPosition from './20240303_user_settings_window_position'

import rawLog from "@bksLogger";


const logger = rawLog.scope('migrations');

const setupSQL = `
 CREATE TABLE IF NOT EXISTS BK_MIGRATIONS(
   name VARCHAR(255) PRIMARY KEY NOT NULL,
   run_at datetime NOT NULL DEFAULT (datetime('now'))
 )
`
const realMigrations = [
  a, b, c, d, ...ultimate, domains, createSettings, addZoom,
  addSc, sslFiles, sslReject, pinned, addSort,
  createCreds, workspaceScoping, workspace2, addTabs, scWorkspace, systemTheme,

  serverCerts, socketPath, connectionOptions, keepaliveInterval, redshiftOptions,
  createHiddenEntities, createHiddenSchemas, cassandraOptions, readOnlyMode, connectionPins, fixKeymapType, bigQueryOptions,
  firebirdConnection, exportPath, UserSettingsWindowPosition,
  demoSetup, minimalMode, tokenCache, libsqlOptions, nameTokenCache, lastUsedWorkspace,
  maxAllowedAppRelease, userSettingKeymap, missingUserSettings,
  useBeta, deleteDuplicateConnections, addNewUrlField
]

// fixtures require the models
const fixtures = [
  encrypt
]

const devMigrations = [
  dev1, dev2, dev3, dev4, dev5, dev6, dev7
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

  async isFreshInstall() {

    const runner = this.connection.connection.createQueryRunner()

    try {
      const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name='bk_migrations';`
      const runPreviously = await runner.query(sql)
      return runPreviously.length === 0
    } finally {
      runner.release()
    }
  }

  async run() {
    console.log("running migrations")
    const runner = this.connection.connection.createQueryRunner()
    try {
      await runner.query(setupSQL)
      for(let i = 0; i < migrations.length; i++) {
        const migration = migrations[i]
        logger.debug(`Checking migration ${migration.name}`)
        if(migration.env && migration.env !== this.env) {
          // env defined, and does not match
          logger.debug(`Skipping ${migration.name} in ${this.env}, required ${migration.env} `)
          continue
        }
        const hasRun = await Manager.checkExists(runner, migration.name)
        if (!hasRun) {
          try {
            await migration.run(runner, this.env)
            await Manager.markExists(runner, migration.name)
          } catch (err) {
            console.log(`Migration ${migration.name} failed with`, err.name, err.message)
          }
        }
      }
    } finally {
      runner.release()
    }
  }

}
