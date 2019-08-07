
import os from 'os'
import path from 'path'

export default {
  userDirectory: path.join(os.homedir(), ".beekeeper-studio"),
  defaults: {
    connectionTypes: [
      { name: 'MySql', value: 'mysql' },
      { name: 'Postgres', value: 'psql' }
    ],
    connectionConfig: {
      connectionType: null,
      host: null,
      port: null,
      user: null,
      password: null,
      defaultDatabase: null
    }
  }
}
