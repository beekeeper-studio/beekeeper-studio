import { PoolConfig } from "pg";
import { IDbConnectionServer } from "../../backendTypes";
import { PsqlConnection } from "../postgresql/PsqlConnection";
import BksConfig from "@/common/bksConfig";

export class CockroachConnection extends PsqlConnection {
  protected async configDatabase(server: IDbConnectionServer, database: { database: string }) {
    const optionsParts: string[] = [];
    const password = server.config.options?.jwtAuthEnabled
      ? server.config.password?.replace(/\s+/g, '')
      : server.config.password;
    const cluster = server.config.options?.cluster || undefined;
    if (cluster) {
      optionsParts.push(`--cluster=${cluster}`);
    }

    if (server.config.options?.jwtAuthEnabled) {
      optionsParts.push('--crdb:jwt_auth_enabled=true');
    }

    const optionsString = optionsParts.length > 0 ? optionsParts.join(' ') : undefined;

    const config: PoolConfig = {
      host: server.config.host,
      port: server.config.port || undefined,
      password: password || undefined,
      database: database.database,
      max: BksConfig.db.cockroachdb.maxConnections, // max idle connections per time (30 secs)
      connectionTimeoutMillis: BksConfig.db.cockroachdb.connectionTimeout,
      idleTimeoutMillis: BksConfig.db.cockroachdb.idleTimeout,
      // not in the typings, but works.
      // @ts-ignore
      options: optionsString
    };

    return this.configurePool(config, server, null);
  }

}
