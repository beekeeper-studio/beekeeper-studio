import Sequelize from 'sequelize'
import sequelize from '../sequelize-db'

const ConnectionConfig = sequelize.define('connection_config',
  {
    connectionType: {
      type: Sequelize.ENUM,
      values: ['postgres', 'mysql'],
      defaultValue: 'mysql'
    },
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
  },
  // END OF COLUMNS
  {
    instanceMethods: {
      setDefaultsFor(cType) {
        if(cType === 'mysql') {
          this.host = this.host || 'localhost'
        }
      }
    }
  }


)

export default ConnectionConfig
