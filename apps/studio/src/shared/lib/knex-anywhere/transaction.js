import Transaction from 'knex/lib/execution/transaction'
const debugTx     = require('debug')('knex:tx')

import { assign } from 'lodash'

class Sqlanywhere_Transaction extends Transaction {
  begin() {
    return Promise.resolve()
  }

  commit(conn, value) {
    this._completed = true
    return conn.commitAsync()
      .return(value)
      .then(this._resolver, this._rejecter)
  }

  release(conn, value) {
    return this._resolver(value)
  }

  rollback(conn, err) {
    this._completed = true
    debugTx('%s: rolling back', this.txid)
    return conn.rollbackAsync()
      .throw(err)
      .catch(this._rejecter)
  }

  acquireConnection(config) {
    const t = this
    return Promise.try(function() {
      return config.connection || t.client.acquireConnection()
    }).tap(function(connection) {
  	if (!t.outerTx) {
        return connection.execAsync( "set temporary option auto_commit = 'off'" )
      }
    }).disposer(function(connection) {
      debugTx('%s: releasing connection', t.txid)
      if (!t.outerTx ) {
        return connection.execAsync( "set temporary option auto_commit = 'on'" ).then( function() {
          if (!config.connection) {
            t.client.releaseConnection(connection)
          } else {
            debugTx('%s: not releasing external connection', t.txid)
          }
        })
      }
    })
  }
  
}

export default Sqlanywhere_Transaction
