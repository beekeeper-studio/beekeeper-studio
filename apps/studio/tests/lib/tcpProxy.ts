import net from 'net'

interface SocketPair {
  client: net.Socket
  upstream: net.Socket
  blackholed: boolean
}

/**
 * A TCP proxy that can break the connections running through it, so tests can
 * simulate what happens to a long-lived database connection when the network
 * dies underneath it.
 *
 * Two failure modes, because databases drivers treat them very differently:
 *
 *   blackholeExisting() - a stateful firewall / NAT / VPN silently stops
 *     forwarding an established flow, or the machine suspends. Bytes vanish in
 *     both directions, but there is no FIN and no RST, so both peers still
 *     believe the socket is open.
 *
 *   destroyExisting() - the network or the server hard-drops the sockets. The
 *     client sees a close/reset immediately.
 *
 * In both cases *new* connections through the proxy still succeed, which is
 * what makes "reconnecting fixes it" reproducible.
 */
export class TcpProxy {
  private server: net.Server
  private pairs = new Set<SocketPair>()

  public port: number

  constructor(private targetHost: string, private targetPort: number) {}

  get liveConnections(): number {
    return this.pairs.size
  }

  listen(port = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((client) => {
        const upstream = net.createConnection({ host: this.targetHost, port: this.targetPort })
        const pair: SocketPair = { client, upstream, blackholed: false }
        this.pairs.add(pair)

        client.on('data', (d) => { if (!pair.blackholed) upstream.write(d) })
        upstream.on('data', (d) => { if (!pair.blackholed) client.write(d) })

        const cleanup = () => {
          this.pairs.delete(pair)
          client.destroy()
          upstream.destroy()
        }
        for (const socket of [client, upstream]) {
          socket.on('error', cleanup)
          socket.on('close', cleanup)
          socket.on('end', cleanup)
        }
      })
      this.server.on('error', reject)
      this.server.listen(port, '127.0.0.1', () => {
        this.port = (this.server.address() as net.AddressInfo).port
        resolve(this.port)
      })
    })
  }

  /** Silently stop forwarding bytes on every established connection. */
  blackholeExisting(): number {
    let count = 0
    for (const pair of this.pairs) {
      pair.blackholed = true
      count++
    }
    return count
  }

  /** Hard-close every established connection. */
  destroyExisting(): number {
    let count = 0
    for (const pair of this.pairs) {
      pair.client.destroy()
      pair.upstream.destroy()
      count++
    }
    this.pairs.clear()
    return count
  }

  async close(): Promise<void> {
    this.destroyExisting()
    if (!this.server) return
    await new Promise<void>((resolve) => this.server.close(() => resolve()))
  }
}

type Settled<T> =
  | { state: 'resolved', ms: number, value: T }
  | { state: 'rejected', ms: number, error: Error }
  | { state: 'pending', ms: number }

/**
 * Race a promise against a deadline and report which way it went, without
 * leaving a dangling unhandled rejection when it loses the race.
 */
export async function settleWithin<T>(promise: Promise<T>, ms: number): Promise<Settled<T>> {
  const start = Date.now()
  let timer: NodeJS.Timeout

  const outcome = promise.then(
    (value) => ({ state: 'resolved' as const, value }),
    (error) => ({ state: 'rejected' as const, error })
  )

  const deadline = new Promise<{ state: 'pending' }>((resolve) => {
    timer = setTimeout(() => resolve({ state: 'pending' }), ms)
  })

  try {
    const result = await Promise.race([outcome, deadline])
    return { ...result, ms: Date.now() - start } as Settled<T>
  } finally {
    clearTimeout(timer)
  }
}
