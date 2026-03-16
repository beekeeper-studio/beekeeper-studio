import { DatabaseConnection } from "@/lib/db/clients/DatabaseConnection";
import {
  createClient,
  ClickHouseClient as NodeClickHouseClient,
} from "@clickhouse/client";

export class ClickHouseConnection extends DatabaseConnection<NodeClickHouseClient> {
  private client: NodeClickHouseClient;

  protected async doConnect(): Promise<void> {
    let url: string;

    if (this.server.config.url) {
      url = this.server.config.url;
    } else {
      const host = this.server.sshTunnel
        ? this.server.config.localHost
        : this.server.config.host;
      const port = this.server.sshTunnel
        ? this.server.config.localPort
        : this.server.config.port;
      const urlObj = new URL("http://example.com/");
      urlObj.hostname = host;
      urlObj.port = port.toString();
      urlObj.protocol = this.server.config.ssl ? "https:" : "http:";
      url = urlObj.toString();
    }

    this.client = createClient({
      url,
      username: this.server.config.user,
      password: this.server.config.password,
      database: this.database.database,
      application: "Beekeeper Studio",
      clickhouse_settings: {
        default_format: "JSONCompact",
      },
      request_timeout: 120_000, // 2 minutes
    });
  }

  protected async doDisconnect(): Promise<void> {
    await this.client.close();
  }

  protected async doGetClient(): Promise<NodeClickHouseClient> {
    const pingResult = await this.client.ping();
    if (pingResult.success === false) {
      throw pingResult.error;
    }
    return this.client;
  }

  protected isConnectionLostError(err: any): boolean {
    const stringifiedErr = String(err);
    return (
      ("code" in err && err.code === "ECONNRESET") ||
      stringifiedErr.includes("Connection terminated unexpectedly") ||
      stringifiedErr.includes("Database connection lost")
    );
  }
}
