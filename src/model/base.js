
import Bookshelf from 'bookshelf'
import Knex from 'knex'

var knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: "./beekeeper.sqlite"
  }
});

const bookshelf = Bookshelf(knex)

// Defining models
const Connection = Bookshelf.model('Connection', {
  tableName: 'saved_connections'
})

export default {
  bookshelf, Connection
}