import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'

export default {
  name: 'dev-14',
  env: 'development',
  dbs: [
    {
      name: '[DEV] Docker TiDB',
      connectionType: 'tidb',
      host: 'localhost',
      port: 4000,
      username: 'root',
      password: '',
      defaultDatabase: 'test',
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
