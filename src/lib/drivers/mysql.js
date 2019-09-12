
import mysql from 'mysql'
import _ from 'lodash'

class MySQLDriver {

  constructor(options) {
    this.options = options
    this.options.database = this.options.defaultDatabase
    this.database = this.options.database
    this.connection = mysql.createConnection(this.options)
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.connection.connect((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(true)
        }
      })
    })
  }

  end() {
    return new Promise((resolve, reject) => {
      this.connection.end((err) => {
        resolve(true)
      })
    })
  }

  listTables() {
    const sql = `
    SELECT table_name as name
    FROM information_schema.tables
    WHERE table_schema = ${this.database}
    AND table_type NOT LIKE '%VIEW%'
    ORDER BY table_name
    `
  }

  getTables(db) {
    return new Promise((resolve, reject) => {
      const options = {
        sql: "show tables"
      }
      this.connection.query(options, (error, results, fields) => {
        if (error) {
          reject(error)

        } else {
          const realResults = _.map(results, (table) => {
            return {name: table, columns: []}
          })
          resolve(realResults)
        }

      })
    })

  }


}

export {
  MySQLDriver
}
