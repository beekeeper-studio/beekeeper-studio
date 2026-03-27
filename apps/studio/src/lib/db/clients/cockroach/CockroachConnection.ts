import { PoolConfig } from "pg";
import { IDbConnectionServer } from "../../backendTypes";
import { PsqlConnection } from "../postgresql/PsqlConnection";
import BksConfig from "@/common/bksConfig";

export class CockroachConnection extends PsqlConnection {
  protected async configDatabase(server: IDbConnectionServer, database: { database: string }) {
    let optionsString = undefined;
    const cluster = server.config.options?.cluster || undefined;
    if (cluster) {
      optionsString = `--cluster=${cluster}`;
    }

    const config: PoolConfig = {
      host: server.config.host,
      port: server.config.port || undefined,
      password: server.config.password || undefined,
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
