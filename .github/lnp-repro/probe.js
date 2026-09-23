// Local network probe for the Local Network privacy UUID clash repro (#4774, #4088).
// Runs inside an app's own main executable via ELECTRON_RUN_AS_NODE=1, so macOS
// attributes the traffic to that app.
// Usage: probe.js <label> <resultPrefix> <tcp|dns|mdns|bcast>:<host>:<port>...
const net = require('net')
const dgram = require('dgram')
const fs = require('fs')

const [label, res, ...targets] = process.argv.slice(2)

const label63 = (s) => [s.length, ...Buffer.from(s)]
const query = (id, labels, type) => Buffer.from([
  id >> 8, id & 0xff, id ? 0x01 : 0x00, 0, 0, 1, 0, 0, 0, 0, 0, 0,
  ...labels.flatMap(label63), 0, 0, type, 0, 1,
])
const payloads = {
  // A record for apple.com, to a unicast DNS server
  dns: query(0x1234, ['apple', 'com'], 1),
  // PTR _services._dns-sd._udp.local, the standard Bonjour browse query
  mdns: query(0, ['_services', '_dns-sd', '_udp', 'local'], 12),
  bcast: Buffer.from('beekeeper local network probe'),
}

const tcp = (host, port) => new Promise((done) => {
  const t0 = Date.now()
  const s = net.connect({ host, port: Number(port), timeout: 4000 })
  const end = (r) => { s.destroy(); done(`tcp ${host}:${port} -> ${r} (${Date.now() - t0}ms)`) }
  s.on('connect', () => end('CONNECTED'))
  s.on('timeout', () => end('TIMEOUT'))
  s.on('error', (e) => end(e.code || e.message))
})

const udp = (kind, host, port) => new Promise((done) => {
  const t0 = Date.now()
  const s = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  let finished = false
  let sent = false
  const end = (r) => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    s.close()
    done(`${kind} ${host}:${port} -> ${r} (${Date.now() - t0}ms)`)
  }
  const timer = setTimeout(() => end(sent ? 'SENT, NO REPLY' : 'TIMEOUT'), 3000)
  s.on('message', () => end('REPLY'))
  s.on('error', (e) => end(e.code || e.message))
  s.bind(0, () => {
    if (kind === 'bcast') s.setBroadcast(true)
    s.send(payloads[kind], Number(port), host, (e) => {
      if (e) end(e.code || e.message)
      else sent = true
    })
  })
})

const round = async (n) => {
  const results = []
  for (const t of targets) {
    const [kind, host, port] = t.split(':')
    results.push(await (kind === 'tcp' ? tcp(host, port) : udp(kind, host, port)))
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
