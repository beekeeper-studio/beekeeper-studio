import net from "net"

/**
 * TCP proxy that can turn into a black hole. With `silent` on, both sockets
 * stay open but nothing is forwarded and no FIN or RST is ever relayed, which
 * is what a dead network path looks like to a client: a laptop that changed
 * networks, a NAT or firewall that dropped the flow, an SSH bastion that lost
 * its uplink. There is no error for a driver to react to; only its own
 * timeouts or keepalives can notice.
 */
export class SilentProxy {
  silent = false
  port: number
  private server: net.Server
  private sockets = new Set<net.Socket>()

  constructor(private targetHost: string, private targetPort: number) {}

  async start(): Promise<void> {
    // allowHalfOpen: a FIN from one side must not make node answer with a FIN
    // on our behalf while silent; a black hole never answers.
    this.server = net.createServer({ allowHalfOpen: true }, (client) => {
      const upstream = net.connect({ port: this.targetPort, host: this.targetHost, allowHalfOpen: true })
      this.sockets.add(client)
      this.sockets.add(upstream)
      client.on("data", (chunk) => { if (!this.silent) upstream.write(chunk) })
      upstream.on("data", (chunk) => { if (!this.silent) client.write(chunk) })
      client.on("end", () => { if (!this.silent) upstream.end() })
      upstream.on("end", () => { if (!this.silent) client.end() })
      client.on("close", () => { if (!this.silent) upstream.destroy() })
      upstream.on("close", () => { if (!this.silent) client.destroy() })
      client.on("error", () => undefined)
      upstream.on("error", () => undefined)
    })
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", () => resolve()))
    this.port = (this.server.address() as net.AddressInfo).port
  }

  /** Tears every socket down for real, so clients finally see the connection end. */
  async stop(): Promise<void> {
    this.sockets.forEach((s) => s.destroy())
    this.sockets.clear()
    await new Promise<void>((resolve) => this.server.close(() => resolve()))
  }
}
