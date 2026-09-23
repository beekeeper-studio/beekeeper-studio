// Local network probe for the Local Network privacy UUID clash repro (#4774, #4088).
// Runs inside an app's own main executable via ELECTRON_RUN_AS_NODE=1, so macOS
// attributes the connections to that app.
// Usage: probe.js <label> <resultPrefix> <host:port>...
const net = require('net')
const fs = require('fs')

const [label, res, ...targets] = process.argv.slice(2)

const attempt = (host, port) => new Promise((done) => {
  const t0 = Date.now()
  const s = net.connect({ host, port: Number(port), timeout: 4000 })
  const end = (r) => { s.destroy(); done(`${host}:${port} -> ${r} (${Date.now() - t0}ms)`) }
  s.on('connect', () => end('CONNECTED'))
  s.on('timeout', () => end('TIMEOUT'))
  s.on('error', (e) => end(e.code || e.message))
})

const round = async (n) => {
  const results = []
  for (const t of targets) {
    const i = t.lastIndexOf(':')
    results.push(await attempt(t.slice(0, i), t.slice(i + 1)))
  }
  fs.writeFileSync(`${res}.r${n}.json`, JSON.stringify({ label, execPath: process.execPath, round: n, results }, null, 1))
}

;(async () => {
  await round(1)
  // Stay alive so macOS can show its alert, until the harness says go (or 90s).
  const deadline = Date.now() + 90000
  while (!fs.existsSync(`${res}.go`) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500))
  }
  await round(2)
  process.exit(0)
})()
