import type mssql from 'mssql'

// mssql keeps the "active" driver in a process-wide singleton (lib/shared.js), and loading a
// driver entrypoint overwrites it: requiring `mssql/msnodesqlv8` for integrated auth swaps
// shared.driver.Request/Transaction to the ODBC implementations. The base pool and transaction
// build every request from that singleton (`new shared.driver.Request(this)`), so after one
// integrated-auth attempt every tedious pool in the process hands out msnodesqlv8 Requests,
// which fail with "connection.queryRaw is not a function".
//
// Binding a pool class to its own driver module's Request/Transaction makes it immune to
// whichever driver was loaded last, so tedious and msnodesqlv8 connections can coexist.

type MssqlDriverModule = Pick<typeof mssql, 'ConnectionPool' | 'Transaction' | 'Request'>

export function bindDriver(driver: MssqlDriverModule): typeof mssql.ConnectionPool {
  class BoundTransaction extends driver.Transaction {
    request() {
      return new driver.Request(this)
    }
  }

  class BoundConnectionPool extends driver.ConnectionPool {
    request() {
      return new driver.Request(this)
    }

    transaction() {
      return new BoundTransaction(this)
    }
  }

  return BoundConnectionPool
}
