import { DatabaseConnector } from "@/lib/db/clients/DatabaseConnector";
import {
  createClient,
  ClickHouseClient as NodeClickHouseClient,
  DataFormat,
  ExecParams,
  ExecResult,
  InsertParams,
  InsertResult,
  QueryParams,
  QueryResult,
} from "@clickhouse/client";
import { readFileSync } from 'fs';
import { NodeClickHouseClientConfigOptions } from "@clickhouse/client/dist/config";
import https from 'https'
import { Readable } from "stream";

export class ClickHouseConnector extends DatabaseConnector<
  NodeClickHouseClient
> {
  private client: NodeClickHouseClient;

  async query<Format extends DataFormat = "JSON">(
    params: Omit<QueryParams, "format"> & { format?: Format }
  ): Promise<QueryResult<Format>> {
    const conn = await this.getRawConnection();
    try {
      return await conn.query(params);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async exec(params: ExecParams): Promise<ExecResult<Readable>> {
    const conn = await this.getRawConnection();
    try {
      return await conn.exec(params);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async insert(params: InsertParams<Readable>): Promise<InsertResult> {
    const conn = await this.getRawConnection();
    try {
      return await conn.insert(params);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  protected async doConnect(): Promise<void> {
    let url: string;

    if (this.server.config.url) {
      url = this.server.config.url;
      // Route the user-provided URL through the SSH tunnel's local endpoint.
      if (this.server.sshTunnel) {
        const urlObj = new URL(url);
        urlObj.hostname = this.server.config.localHost;
        urlObj.port = this.server.config.localPort.toString();
        url = urlObj.toString();
      }
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

    const config: NodeClickHouseClientConfigOptions = {
      url,
      username: this.server.config.user,
      password: this.server.config.password,
      database: this.database.database,
      application: "Beekeeper Studio",
      clickhouse_settings: {
        default_format: "JSONCompact",
      },
      request_timeout: 120_000, // 2 minutes
    };
    if (this.server.config.ssl) {
      let hasCerts = false;
      // ClickHouse client supports both one-way and mutual TLS authentication. If sslCertFile and sslKeyFile are provided, we will use mutual TLS, otherwise we will use one-way TLS.
      if (this.server.config.sslCaFile) {
        hasCerts = true;
        if (this.server.config.sslCertFile && this.server.config.sslKeyFile) {
          config.tls = {
            ca_cert: readFileSync(this.server.config.sslCaFile),
            cert: readFileSync(this.server.config.sslCertFile),
            key: readFileSync(this.server.config.sslKeyFile),
          };
        } else {
          config.tls = {
            ca_cert: readFileSync(this.server.config.sslCaFile),
          };
        }
      }

      // Beekeeper's default behavior is to disable verification unless certificates are provided.
      if (!hasCerts || !this.server.config.sslRejectUnauthorized) {
        config.http_agent = new https.Agent({
          rejectUnauthorized: false
        });
      }
    }

    this.client = createClient(config);
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
