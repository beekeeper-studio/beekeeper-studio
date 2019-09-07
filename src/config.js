
import os from 'os'
import path from 'path'

export default {
  userDirectory: path.join(os.homedir(), ".beekeeper-studio"),
  defaults: {
    connectionTypes: [
      { name: 'MySql', value: 'mysql' },
      { name: 'Postgres', value: 'psql' }
    ],
    ports: {
      'mysql': 3306,
      'psql': 5432
    },
    connectionConfig: {
      connectionType: null,
      host: 'localhost',
      port: null,
      user: null,
      password: null,
      defaultDatabase: null
    }
  }
}
