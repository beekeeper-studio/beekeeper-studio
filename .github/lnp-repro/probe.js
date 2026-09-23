// Local network probe for the Local Network privacy UUID clash repro (#4774, #4088).
// Runs inside an app's own main executable via ELECTRON_RUN_AS_NODE=1, so macOS
// attributes the traffic to that app.
// Usage: probe.js <label> <resultPrefix> <tcp|udp>:<host>:<port>...
const net = require('net')
const dgram = require('dgram')
const fs = require('fs')

const [label, res, ...targets] = process.argv.slice(2)

// DNS query for apple.com (A record), used to get a reply from the gateway over UDP
const dnsQuery = Buffer.concat([
  Buffer.from([0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]),
  Buffer.from([5, ...Buffer.from('apple'), 3, ...Buffer.from('com'), 0, 0, 1, 0, 1]),
])

const tcp = (host, port) => new Promise((done) => {
  const t0 = Date.now()
  const s = net.connect({ host, port: Number(port), timeout: 4000 })
  const end = (r) => { s.destroy(); done(`tcp ${host}:${port} -> ${r} (${Date.now() - t0}ms)`) }
  s.on('connect', () => end('CONNECTED'))
  s.on('timeout', () => end('TIMEOUT'))
  s.on('error', (e) => end(e.code || e.message))
})

const udp = (host, port) => new Promise((done) => {
  const t0 = Date.now()
  const s = dgram.createSocket('udp4')
  let finished = false
  const end = (r) => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    s.close()
    done(`udp ${host}:${port} -> ${r} (${Date.now() - t0}ms)`)
  }
  const timer = setTimeout(() => end('TIMEOUT'), 4000)
  s.on('message', () => end('REPLY'))
  s.on('error', (e) => end(e.code || e.message))
  s.send(dnsQuery, Number(port), host, (e) => { if (e) end(e.code || e.message) })
})

const round = async (n) => {
  const results = []
  for (const t of targets) {
    const [proto, host, port] = t.split(':')
    results.push(await (proto === 'udp' ? udp(host, port) : tcp(host, port)))
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
