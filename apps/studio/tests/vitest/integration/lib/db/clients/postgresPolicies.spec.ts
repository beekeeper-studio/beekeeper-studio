import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"
import { createServer } from "@commercial/backend/lib/db/server"
import { IDbConnectionServerConfig } from "@/lib/db/types"
import { PostgresClient } from "@/lib/db/clients/postgresql"
import { PolicyAlterations } from "@shared/lib/dialects/models"

const TIMEOUT = 120000

describe("Postgres row level security policies", () => {
  let container: StartedTestContainer
  let connection: PostgresClient
  let server: ReturnType<typeof createServer>

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16.4")
      .withEnvironment({ POSTGRES_PASSWORD: "example", POSTGRES_DB: "banana" })
      .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections", 2))
      .withExposedPorts(5432)
      .withStartupTimeout(TIMEOUT)
      .start()

    const config: IDbConnectionServerConfig = {
      client: "postgresql",
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: "postgres",
      password: "example",
      osUser: "foo",
      ssh: null,
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: false,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: false,
    }

    server = createServer(config)
    connection = server.createConnection("banana") as unknown as PostgresClient
    await connection.connect()

    await connection.executeQuery(`CREATE ROLE app_user`)
    await connection.executeQuery(`CREATE ROLE "Reporting Team"`)
    await connection.executeQuery(`CREATE ROLE bystander LOGIN PASSWORD 'example'`)
  }, TIMEOUT)

  afterAll(async () => {
    // server.disconnect() ends every connection it handed out
    await server?.disconnect()
    await container?.stop()
  }, TIMEOUT)

  beforeEach(async () => {
    await connection.executeQuery(`DROP TABLE IF EXISTS public.orders`)
    await connection.executeQuery(`
      CREATE TABLE public.orders (id serial primary key, owner text);
      ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON public.orders
        FOR SELECT TO app_user USING (owner = current_user);
      CREATE POLICY writes_are_owned ON public.orders
        AS RESTRICTIVE FOR INSERT TO app_user, "Reporting Team"
        WITH CHECK (owner = current_user);
      CREATE POLICY everyone ON public.orders FOR ALL USING (true);
    `)
  })

  it("reports policies as postgres supports them", async () => {
    expect((await connection.supportedFeatures()).policies).toBe(true)
  })

  it("lists every policy on the table", async () => {
    const policies = await connection.listTablePolicies("orders", "public")

    expect(policies.map((p) => p.name)).toEqual([
      "everyone",
      "tenant_isolation",
      "writes_are_owned",
    ])

    const tenant = policies.find((p) => p.name === "tenant_isolation")
    expect(tenant).toMatchObject({
      table: "orders",
      schema: "public",
      permissive: true,
      command: "SELECT",
      roles: ["app_user"],
      check: null,
    })
    expect(tenant.using).toContain("owner")
  })

  it("parses restrictive policies and multi-role lists, quoted names included", async () => {
    const policies = await connection.listTablePolicies("orders", "public")
    const restrictive = policies.find((p) => p.name === "writes_are_owned")

    expect(restrictive.permissive).toBe(false)
    expect(restrictive.command).toBe("INSERT")
    // pg_policies returns roles sorted by name, not in declaration order
    expect([...restrictive.roles].sort()).toEqual(["Reporting Team", "app_user"])
    expect(restrictive.using).toBeNull()
    expect(restrictive.check).toContain("owner")
  })

  it("reads PUBLIC as a role", async () => {
    const policies = await connection.listTablePolicies("orders", "public")
    expect(policies.find((p) => p.name === "everyone").roles).toEqual(["public"])
  })

  it("returns nothing for a table with no policies", async () => {
    await connection.executeQuery(`CREATE TABLE public.no_policies (id int)`)
    expect(await connection.listTablePolicies("no_policies", "public")).toEqual([])
  })

  it("creates a policy", async () => {
    await connection.alterPolicy({
      table: "orders",
      schema: "public",
      additions: [
        {
          name: "owner_updates",
          command: "UPDATE",
          permissive: false,
          roles: ["app_user", "Reporting Team"],
          using: "owner = current_user",
          check: "owner IS NOT NULL",
        },
      ],
      alterations: [],
      drops: [],
    })

    const created = (await connection.listTablePolicies("orders", "public"))
      .find((p) => p.name === "owner_updates")

    expect(created).toBeTruthy()
    expect(created.permissive).toBe(false)
    expect(created.command).toBe("UPDATE")
    expect([...created.roles].sort()).toEqual(["Reporting Team", "app_user"])
    expect(created.using).toContain("owner")
    expect(created.check).toContain("IS NOT NULL")
  })

  it("creates a policy from nothing but a name", async () => {
    await connection.alterPolicy({
      table: "orders",
      schema: "public",
      additions: [{ name: "bare" }],
      alterations: [],
      drops: [],
    })

    const created = (await connection.listTablePolicies("orders", "public"))
      .find((p) => p.name === "bare")

    expect(created).toMatchObject({
      permissive: true,
      command: "ALL",
      roles: ["public"],
      using: null,
      check: null,
    })
  })

  it("replaces a policy under the same name, changing its command", async () => {
    // the only way to change a policy's command, so drops have to run first
    await connection.alterPolicy({
      table: "orders",
      schema: "public",
      additions: [{ name: "tenant_isolation", command: "DELETE", using: "owner = current_user" }],
      alterations: [],
      drops: [{ name: "tenant_isolation" }],
    })

    const policies = await connection.listTablePolicies("orders", "public")
    expect(policies.filter((p) => p.name === "tenant_isolation")).toHaveLength(1)
    expect(policies.find((p) => p.name === "tenant_isolation").command).toBe("DELETE")
  })

  it("rolls the whole batch back when one statement fails", async () => {
    await expect(
      connection.alterPolicy({
        table: "orders",
        schema: "public",
        // INSERT policies take no USING expression, so postgres rejects this
        additions: [{ name: "bad", command: "INSERT", using: "true" }],
        alterations: [],
        drops: [{ name: "everyone" }],
      })
    ).rejects.toThrow()

    const policies = await connection.listTablePolicies("orders", "public")
    expect(policies.map((p) => p.name)).toEqual([
      "everyone",
      "tenant_isolation",
      "writes_are_owned",
    ])
  })

  it("renames a policy and replaces its roles and expressions", async () => {
    const changes: PolicyAlterations = {
      table: "orders",
      schema: "public",
      additions: [],
      alterations: [
        {
          name: "tenant_isolation",
          newName: "tenant_isolation_v2",
          roles: ["app_user", "Reporting Team"],
          using: "owner <> 'nobody'",
        },
      ],
      drops: [],
    }

    await connection.alterPolicy(changes)

    const policies = await connection.listTablePolicies("orders", "public")
    const renamed = policies.find((p) => p.name === "tenant_isolation_v2")
    expect(renamed).toBeTruthy()
    expect(policies.find((p) => p.name === "tenant_isolation")).toBeUndefined()
    expect([...renamed.roles].sort()).toEqual(["Reporting Team", "app_user"])
    expect(renamed.using).toContain("nobody")
  })

  it("applies a WITH CHECK expression", async () => {
    await connection.alterPolicy({
      table: "orders",
      schema: "public",
      additions: [],
      alterations: [{ name: "writes_are_owned", check: "owner IS NOT NULL" }],
      drops: [],
    })

    const policies = await connection.listTablePolicies("orders", "public")
    expect(policies.find((p) => p.name === "writes_are_owned").check).toContain("IS NOT NULL")
  })

  it("drops policies", async () => {
    await connection.alterPolicy({
      table: "orders",
      schema: "public",
      additions: [],
      alterations: [],
      drops: [{ name: "everyone" }, { name: "writes_are_owned" }],
    })

    const policies = await connection.listTablePolicies("orders", "public")
    expect(policies.map((p) => p.name)).toEqual(["tenant_isolation"])
  })

  it("alters and drops in one round trip", async () => {
    await connection.alterPolicy({
      table: "orders",
      schema: "public",
      additions: [],
      alterations: [{ name: "everyone", using: "false" }],
      drops: [{ name: "writes_are_owned" }],
    })

    const policies = await connection.listTablePolicies("orders", "public")
    expect(policies.map((p) => p.name)).toEqual(["everyone", "tenant_isolation"])
    expect(policies.find((p) => p.name === "everyone").using).toBe("false")
  })

  it("builds sql without touching the database", async () => {
    const sql = await connection.alterPolicySql({
      table: "orders",
      schema: "public",
      additions: [{ name: "fresh", command: "SELECT", using: "true" }],
      alterations: [{ name: "everyone", using: "false" }],
      drops: [{ name: "writes_are_owned" }],
    })

    expect(sql).toBe(
      `DROP POLICY "writes_are_owned" ON "public"."orders";` +
      `ALTER POLICY "everyone" ON "public"."orders" USING (false);` +
      `CREATE POLICY "fresh" ON "public"."orders" FOR SELECT TO PUBLIC USING (true)`
    )
    // nothing ran
    const policies = await connection.listTablePolicies("orders", "public")
    expect(policies).toHaveLength(3)
  })

  describe("without permission", () => {
    let restricted: PostgresClient
    let restrictedServer: ReturnType<typeof createServer>

    beforeEach(async () => {
      // the outer hook recreates the table, so the grant has to be redone
      await connection.executeQuery(`GRANT SELECT ON public.orders TO bystander`)
    })

    beforeAll(async () => {
      restrictedServer = createServer({
        client: "postgresql",
        host: container.getHost(),
        port: container.getMappedPort(5432),
        user: "bystander",
        password: "example",
        osUser: "foo",
        ssh: null,
        sslCaFile: null,
        sslCertFile: null,
        sslKeyFile: null,
        sslRejectUnauthorized: false,
        ssl: false,
        domain: null,
        socketPath: null,
        socketPathEnabled: false,
        readOnlyMode: false,
      })
      restricted = restrictedServer.createConnection("banana") as unknown as PostgresClient
      await restricted.connect()
    }, TIMEOUT)

    afterAll(async () => {
      await restrictedServer?.disconnect()
    })

    it("raises the postgres error when altering a table it doesn't own", async () => {
      await expect(
        restricted.alterPolicy({
          table: "orders",
          schema: "public",
          additions: [],
          alterations: [{ name: "everyone", using: "false" }],
          drops: [],
        })
      ).rejects.toThrow(/must be owner of/i)
    })

    it("raises the postgres error when dropping a policy it doesn't own", async () => {
      await expect(
        restricted.alterPolicy({
          table: "orders",
          schema: "public",
          additions: [],
          alterations: [],
          drops: [{ name: "everyone" }],
        })
      ).rejects.toThrow(/must be owner of/i)
    })
  })
})
