import { afterEach, describe, expect, it, vi } from "vitest";
import mysql from "mysql2";
import globals from "@/common/globals";
import { MySqlConnector } from "@/lib/db/clients/mysql/MySqlConnector";
import { refreshTokenIfNeeded } from "@/lib/db/clients/utils";

vi.mock("@/lib/db/clients/utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    refreshTokenIfNeeded: vi.fn(),
  };
});

class ProbeConnector extends MySqlConnector {
  async start() {
    await this.doConnect();
  }
  async configDatabase() {
    return { host: "db.example" };
  }
}

function iamServer() {
  return {
    config: {
      host: "db.example",
      port: 3306,
      user: "iam",
      iamAuthOptions: { iamAuthenticationEnabled: true },
    },
  };
}

describe("MySQL IAM token refresh", () => {
  let pool;
  let connector;

  afterEach(async () => {
    vi.useRealTimers();
    if (connector) {
      await connector.disconnect().catch(() => {});
    }
    vi.clearAllMocks();
  });

  function installPool() {
    pool = {
      getConnection: vi.fn(),
      on: vi.fn(),
      end: vi.fn(),
    };
    vi.spyOn(mysql, "createPool").mockReturnValue(pool);
  }

  it("releases the checked-out connection when token refresh fails", async () => {
    vi.useFakeTimers();
    installPool();
    const connection = { config: {}, release: vi.fn() };
    let refresh;
    pool.getConnection.mockImplementation((callback) => {
      refresh = callback(null, connection);
    });
    refreshTokenIfNeeded.mockRejectedValue(new Error("token request failed"));

    connector = new ProbeConnector({
      server: iamServer(),
      database: { database: "app" },
    });
    await connector.start();

    await vi.advanceTimersByTimeAsync(globals.iamRefreshTime);
    await refresh;

    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(refreshTokenIfNeeded).toHaveBeenCalled();
  });

  it("does not refresh when the pool cannot provide a connection", async () => {
    vi.useFakeTimers();
    installPool();
    let refresh;
    pool.getConnection.mockImplementation((callback) => {
      refresh = callback(new Error("pool closed"));
    });

    connector = new ProbeConnector({
      server: iamServer(),
      database: { database: "app" },
    });
    await connector.start();

    await vi.advanceTimersByTimeAsync(globals.iamRefreshTime);
    await expect(refresh).resolves.toBeUndefined();
    expect(refreshTokenIfNeeded).not.toHaveBeenCalled();
  });
});
