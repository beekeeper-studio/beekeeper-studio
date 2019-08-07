import LowDB from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import config from '../config'


const adapter = new FileSync(config.userDirectory + '/low.json')
const db = LowDB(adapter)
db.defaults({configs: [], queryRuns: [], queries: []}).write()



export default db
