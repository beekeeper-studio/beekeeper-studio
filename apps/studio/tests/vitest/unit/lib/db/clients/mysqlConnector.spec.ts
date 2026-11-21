import { describe, it, expect, vi, beforeEach } from "vitest";

const refreshTokenIfNeeded = vi.hoisted(() => vi.fn(async () => "iam-token"));

vi.mock("@/lib/db/clients/utils", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  refreshTokenIfNeeded,
}));

import { MySqlConnector } from "@/lib/db/clients/mysql/MySqlConnector";

// Not reproduced in the running app (needs an AWS RDS instance with IAM auth);
// found by reading the connector and confirmed here.
describe("MySqlConnector IAM authentication", () => {
  beforeEach(() => refreshTokenIfNeeded.mockClear());

  it("signs the IAM token for the MySQL default port when the port is blank", async () => {
    const server: any = {
      config: {
        client: "mysql",
        host: "db.cluster-abc.us-east-1.rds.amazonaws.com",
        port: null,
        user: "iam_user",
        iamAuthOptions: { iamAuthenticationEnabled: true, awsRegion: "us-east-1" },
      },
    };
    const connector: any = new MySqlConnector({ server, database: { database: "app" } as any });

    const config = await connector.configDatabase(server, { database: "app" });

    expect(config.password).toBe("iam-token");
    // the token is signed for host:port, so the fallback has to be 3306, not postgres' 5432
    expect(refreshTokenIfNeeded).toHaveBeenCalledWith(server.config.iamAuthOptions, server, 3306);
  });
});
