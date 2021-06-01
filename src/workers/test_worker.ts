/* eslint-disable */

import { expose } from 'threads'
import Database from 'better-sqlite3'




expose({
  test() {
    const db = new Database('foo.db')
    console.log('database!', db)
    return db.name
  }
})