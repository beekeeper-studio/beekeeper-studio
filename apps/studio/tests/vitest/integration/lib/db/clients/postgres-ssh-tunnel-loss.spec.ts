import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import path from "path"
import type { EventEmitter } from "events"
import rawLog from "@bksLogger"
import { GenericContainer, Network, StartedNetwork, StartedTestContainer, Wait } from "testcontainers"
import { createServer } from "@commercial/backend/lib/db/server"
import { dbtimeout } from "@tests/lib/db"
import { SilentProxy } from "@tests/vitest/lib/SilentProxy"
import { outcome } from "@tests/vitest/lib/promises"
import type { IDbConnectionServerConfig } from "@/lib/db/types"

rawLog.transports.console.level = "error"

// Reproduction for https://github.com/beekeeper-studio/beekeeper-studio/issues/2370
// (SSH tunnel is not re-established after the network changes), also linked
// from https://github.com/beekeeper-studio/beekeeper-studio/issues/4739.
//
// Postgres and an sshd (the same image tests/docker/ssh.yml builds) share a
// docker network. The tunnel's SSH TCP connection goes through SilentProxy, so
// the SSH link can be made to die the way a changed network kills it: no FIN,
// no RST, just silence. Without keepalives (the app's default) ssh2 never
// notices, the forwarded pg socket never gets an answer, and nothing settles.
//
// Not reproduced, because it does not happen: #4739 suggests disconnect() can
// hang in sshTunnel.connection.shutdown() on a dead tunnel. shutdown() resolves
// without waiting for the forwarding server to close, so disconnect() returns
// promptly here.
//
// Tests not marked (control) assert the desired behaviour and are red until it
// is implemented.

const TAB = 12
// Generous: an ssh keepalive of a few seconds with a small countMax would
// detect a dead link well inside this.
const DETECTION_BOUND = 20000

function catchClientErrors(client: any) {
  for (const pooled of client.conn.pool._clients as EventEmitter[]) {
    pooled.on("error", () => undefined)
  }
}

function destroySockets(client: any) {
  for (const pooled of client.conn.pool._clients) {
    pooled.connection?.stream?.destroy()
  }
}

describe("Postgres over an SSH tunnel whose link silently dies", () => {
  vi.setConfig({ testTimeout: dbtimeout * 2, hookTimeout: dbtimeout * 2 })

  let network: StartedNetwork
  let postgres: StartedTestContainer
  let sshd: StartedTestContainer

  beforeAll(async () => {
    network = await new Network().start()
    postgres = await new GenericContainer("postgres:16.4")
      .withEnvironment({ POSTGRES_PASSWORD: "example", POSTGRES_DB: "banana" })
      .withNetwork(network)
      .withNetworkAliases("postgres")
      .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections", 2))
      .withStartupTimeout(dbtimeout)
      .start()

    const sshImage = await GenericContainer
      .fromDockerfile(path.resolve(process.cwd(), "tests/docker"), "SSHDockerFile")
      .build("bks-test-sshd", { deleteOnExit: false })
    sshd = await sshImage
      .withEnvironment({
        PUID: "1000",
        PGID: "1000",
        PASSWORD_ACCESS: "true",
        USER_PASSWORD: "password",
        USER_NAME: "beekeeper",
      })
      .withExposedPorts(2222)
      .withNetwork(network)
      .withWaitStrategy(Wait.forLogMessage(/ls\.io-init\] done/))
      .withStartupTimeout(dbtimeout)
      .start()
  })

  afterAll(async () => {
    await sshd?.stop()
    await postgres?.stop()
    await network?.stop()
  })

  // Mirrors a saved connection with SSH enabled and no keepalive configured.
  function configVia(proxy: SilentProxy): IDbConnectionServerConfig {
    return {
      client: "postgresql",
      // as seen from inside the ssh container, where the tunnel comes out
      host: "postgres",
      port: 5432,
      user: "postgres",
      password: "example",
      osUser: "foo",
      ssh: {
        host: "127.0.0.1",
        port: proxy.port,
        user: "beekeeper",
        password: "password",
        privateKey: null,
        passphrase: null,
        bastionHost: null,
        bastionPort: null,
        bastionUser: null,
        bastionPassword: null,
        bastionPrivateKey: null,
        bastionPassphrase: null,
        bastionMode: null,
        keepaliveInterval: null,
        useAgent: false,
      },
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: false,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: false,
    } as any
  }

  async function connectThrough(proxy: SilentProxy) {
    const client = createServer(configVia(proxy)).createConnection("banana")
    await client.connect()
    catchClientErrors(client)
    return client
  }

  async function runSelect(client: any) {
    const query = await client.query("SELECT 1 AS ok", TAB)
    return query.execute()
  }

  it("queries through the tunnel (control)", async () => {
    const proxy = new SilentProxy(sshd.getHost(), sshd.getMappedPort(2222))
    await proxy.start()
    const client = await connectThrough(proxy)
    try {
      const [result] = await runSelect(client)
      expect(result.rows).toHaveLength(1)
    } finally {
      await client.disconnect()
      await proxy.stop()
    }
  })

  // #2370. Failing the query or re-establishing the tunnel and retrying would
  // both do; hanging until the OS gives up on the TCP connection does not.
  it("fails or recovers within a bounded time after the SSH link silently dies", async () => {
    const proxy = new SilentProxy(sshd.getHost(), sshd.getMappedPort(2222))
    await proxy.start()
    const client = await connectThrough(proxy)
    let running: Promise<unknown>
    try {
      proxy.silent = true
      running = runSelect(client)

      expect(await outcome(running, DETECTION_BOUND)).not.toBe("pending")
    } finally {
      await proxy.stop()
      destroySockets(client)
      await outcome(running, 2000)
      await outcome(client.disconnect(), 5000)
    }
  })
})
