import { afterEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import globals from "@/common/globals";
import { PsqlConnector } from "@/lib/db/clients/postgresql/PsqlConnector";
import { refreshTokenIfNeeded } from "@/lib/db/clients/utils";

vi.mock("pg", () => {
  const pools = [];
  class FakePool {
    static pools = pools;
    static failNextConnect = false;
    constructor(config) {
      this.config = config;
      this.ended = false;
      this.events = [];
      pools.push(this);
    }
    async connect() {
      if (FakePool.failNextConnect && this !== pools[0]) {
        throw new Error("auth failed");
      }
      return { release() {}, on() {}, off() {} };
    }
    end() {
      this.ended = true;
      return Promise.resolve();
    }
    on(event) {
      this.events.push(event);
    }
  }
  return { default: { Pool: FakePool }, Pool: FakePool };
});

vi.mock("@/lib/db/clients/utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    refreshTokenIfNeeded: vi.fn().mockResolvedValue("fresh-token"),
  };
});

class ProbeConnector extends PsqlConnector {
  async start() {
    await this.doConnect();
  }
  async configDatabase() {
    return { host: "db.example", port: 5432, database: "app" };
  }
}

function iamServer() {
  return {
    config: {
      host: "db.example",
      port: 5432,
      user: "iam",
      iamAuthOptions: { iamAuthenticationEnabled: true },
    },
  };
}

describe("Postgres IAM pool swap", () => {
  let connector;
  const FakePool = pg.Pool;

  afterEach(async () => {
    vi.useRealTimers();
    FakePool.failNextConnect = false;
    FakePool.pools.length = 0;
    if (connector) {
      await connector.disconnect().catch(() => {});
      connector = undefined;
    }
  });

  it("installs the new pool before closing the previous one", async () => {
    vi.useFakeTimers();
    connector = new ProbeConnector({
      server: iamServer(),
      database: { database: "app" },
    });
    await connector.start();

    await vi.advanceTimersByTimeAsync(globals.iamRefreshTime);

    const [previous, current] = FakePool.pools;
    expect(FakePool.pools).toHaveLength(2);
    expect(connector.conn.pool).toBe(current);
    expect(previous.ended).toBe(true);
    expect(current.ended).toBe(false);
    expect(current.events).toEqual(["acquire", "error", "release"]);
    expect(current.config.password).toBe("fresh-token");
  });

  it("closes the replacement pool when the test connection fails", async () => {
    vi.useFakeTimers();
    connector = new ProbeConnector({
      server: iamServer(),
      database: { database: "app" },
    });
    await connector.start();
    FakePool.failNextConnect = true;

    await vi.advanceTimersByTimeAsync(globals.iamRefreshTime);

    const [previous, replacement] = FakePool.pools;
    expect(connector.conn.pool).toBe(previous);
    expect(previous.ended).toBe(false);
    expect(replacement.ended).toBe(true);
  });
});
