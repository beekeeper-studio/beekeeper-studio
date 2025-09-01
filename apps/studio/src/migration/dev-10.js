import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'

export default {
  name: 'dev-9-redis-fixture',
  env: 'development',
  dbs: [
    {
      name: '[DEV] Docker Redis',
      connectionType: 'redis',
      port: 6379,
      host: 'localhost',
      password: '',
      defaultDatabase: '0'
    }
  ],

  async run() {
    const connections = this.dbs.map(db => {
      const connection = new SavedConnection()
      _.merge(connection, db)
      return connection
    })

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      await connection.save()
    }
  }
}
