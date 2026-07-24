import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'
import { HanaAuthType } from '@/lib/db/types'

export default {
  name: 'dev-12-hana-fixtures',
  env: 'development',
  dbs: [
    {
      // docker compose up hana hana-seed
      name: '[DEV] Docker SAP HANA',
      connectionType: 'hana',
      host: 'localhost',
      port: 39041,
      username: 'SYSTEM',
      password: 'HXEHana1',
      hanaOptions: { authMethod: HanaAuthType.Password },
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
