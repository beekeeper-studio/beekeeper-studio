import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'

export default {
  name: 'dev-11-greengage-fixtures',
  env: 'development',
  dbs: [
    {
      name: '[DEV] Docker Greengage 6',
      connectionType: 'greengage',
      host: 'localhost',
      port: 5438,
      username: 'gpadmin',
      password: '',
      defaultDatabase: 'postgres',
    },
    {
      name: '[DEV] Docker Greengage 7',
      connectionType: 'greengage',
      host: 'localhost',
      port: 5439,
      username: 'gpadmin',
      password: '',
      defaultDatabase: 'postgres',
    },
  ],

  async run() {
    const connections = this.dbs.map((db) => {
      const connection = new SavedConnection()
      _.merge(connection, db)
      return connection
    })

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i]
      await connection.save()
    }
  },
}
