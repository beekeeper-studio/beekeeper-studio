import Sequelize from 'sequelize'
import sequelize from '../sequelize-db'

const ConnectionConfig = sequelize.define('connection_config', {
  connectionType: {
    type: Sequelize.ENUM,
    values: ['postgres', 'mysql']
  }
  host: {
    type: Sequelize.STRING
  },
  port: {
    type: Sequelize.INTEGER
  },
  defaultDatabase: {
    type: Sequelize.STRING
  },
  user: {
    type: Sequelize.STRING
  },
  password: {
    type: Sequelize.STRING
  }
})

export default ConnectionConfig
