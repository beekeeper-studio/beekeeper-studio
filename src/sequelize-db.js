
import Sequelize from 'sequelize'
import path from 'path'
import config from './config'

const p = path.join(config.userDirectory, 'app.sqlite')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: p
});




export default sequelize
