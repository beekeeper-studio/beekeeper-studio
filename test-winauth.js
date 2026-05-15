/**
 * Standalone test for Windows Authentication with msnodesqlv8.
 * Run from the apps/studio directory where msnodesqlv8 is installed:
 *
 *   node ../../test-winauth.js --server MYSERVER --port 1433 --database master
 *
 * Or edit the defaults below and just run:
 *
 *   node test-winauth.js
 */

const args = process.argv.slice(2)
const get = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const server   = get('--server',   'localhost')
const port     = get('--port',     '1433')
const database = get('--database', 'master')
const trustCert = get('--trust-cert', 'yes')  // yes or no

const drivers = [
  'ODBC Driver 18 for SQL Server',
  'ODBC Driver 17 for SQL Server',
]

async function tryDriver(driver) {
  const connStr = `Driver={${driver}};Server=${server},${port};Database=${database};Trusted_Connection=yes;TrustServerCertificate=${trustCert};`
  console.log(`\nTrying: ${connStr}`)

  let sql
  try {
    sql = require('msnodesqlv8')
  } catch (e) {
    console.error('ERROR: msnodesqlv8 could not be loaded:', e.message)
    process.exit(1)
  }

  return new Promise((resolve) => {
    sql.open(connStr, (err, conn) => {
      if (err) {
        const msgs = (Array.isArray(err) ? err : [err])
          .map(e => `[${e.sqlstate || '?'}] ${e.message || e}`)
          .join('\n  ')
        console.error(`FAILED:\n  ${msgs}`)
        resolve(false)
      } else {
        console.log('SUCCESS: connection opened, running test query...')
        conn.query('SELECT @@VERSION AS version', (qErr, rows) => {
          if (qErr) {
            console.error('Query error:', qErr)
          } else {
            console.log('Server version:', rows[0]?.version?.split('\n')[0])
          }
          conn.close()
          resolve(true)
        })
      }
    })
  })
}

;(async () => {
  console.log(`Testing Windows Auth connection to ${server}:${port} / ${database}`)

  for (const driver of drivers) {
    const ok = await tryDriver(driver)
    if (ok) {
      console.log(`\nWorking driver: ${driver}`)
      process.exit(0)
    }
  }

  console.error('\nAll drivers failed.')
  process.exit(1)
})()
