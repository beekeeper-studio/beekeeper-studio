// Makes a Bonjour (mDNS) query, which macOS treats as a local network operation,
// from inside whichever app runs this with ELECTRON_RUN_AS_NODE=1. Queries once
// straight away and again after <prefix>.go appears, writing each result
// (REPLY, SENT, EHOSTUNREACH, ...) to <prefix>.1 and <prefix>.2.
// Usage: mac-local-network-probe.js <prefix>
const dgram = require('dgram')
const fs = require('fs')

const prefix = process.argv[2]

// PTR query for _services._dns-sd._udp.local
const labels = ['_services', '_dns-sd', '_udp', 'local']
const query = Buffer.from([
  0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
  ...labels.flatMap((l) => [l.length, ...Buffer.from(l)]), 0,
  0, 12, 0, 1,
])

function bonjourQuery() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    let finished = false
    let sent = false
    const done = (result) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      socket.close()
      resolve(result)
    }
    const timer = setTimeout(() => done(sent ? 'SENT' : 'TIMEOUT'), 3000)
    socket.on('message', () => done('REPLY'))
    socket.on('error', (e) => done(e.code || e.message))
    socket.bind(0, () => {
      socket.send(query, 5353, '224.0.0.251', (e) => {
        if (e) done(e.code || e.message)
        else sent = true
      })
    })
  })
}

;(async () => {
  fs.writeFileSync(`${prefix}.1`, await bonjourQuery())
  // Stay alive so macOS can show its alert, until the check answers it (or 90s)
  const deadline = Date.now() + 90000
  while (!fs.existsSync(`${prefix}.go`) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500))
  }
  fs.writeFileSync(`${prefix}.2`, await bonjourQuery())
  process.exit(0)
})()
