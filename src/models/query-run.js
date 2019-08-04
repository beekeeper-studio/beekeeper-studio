
import Sequelize from 'sequelize'

import sequelize from '../sequelize-db'
import ConnectionConfig from './connection-config'

const QueryRun = sequelize.define('query_run', {
  queryText: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  database: {
    type: Sequelize.STRING,
    allowNull: false
  },
  status: {
    type: Sequelize.ENUM,
    values: ['pending', 'running', 'completed', 'failed'],
    defaultValue: 'pending'
  },
  records: {
    type: Sequelize.BIGINT,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
})

ConnectionConfig.hasMany(QueryRun)
QueryRun.belongsTo(ConnectionConfig)


export default QueryRun
