import Sequelize from 'sequelize'
import sequelize from './db'

const Connection = sequelize.define('connection', {
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

export default Connection
