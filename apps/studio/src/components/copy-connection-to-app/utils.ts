import yaml from 'js-yaml'
import { IDbConnectionServerConfig, ConnectionTypes } from "../../lib/db/types";

export function generateRubyDatabaseYaml(config: IDbConnectionServerConfig): string {
  const adapter = ConnectionTypes.find(conn => conn.name.toLowerCase() === config.connectionType.toLowerCase()) ?? 'postgresql'
  
  const databaseYaml: any = {
    development: {
      adapter,
      database: config.domain,
      host: config.host,
      port: config.port,
      username: config.user,
      password: 'ENTER YOUR PASSWORD HERE',
      sslmode: config.ssl ? 'require' : 'disable',
      ssl: config.ssl ? {
        ca: config.sslCaFile,
        cert: config.sslCertFile,
        key: config.sslKeyFile,
        rejectUnauthorized: config.sslRejectUnauthorized,
      } : undefined,
      socket: config.socketPathEnabled ? config.socketPath : undefined,
    },
    test: {
      adapter,
      database: config.domain ? `${config.domain}_test` : undefined,
      host: config.host,
      port: config.port,
      username: config.user,
      password: 'ENTER YOUR PASSWORD HERE',
      sslmode: config.ssl ? 'require' : 'disable',
      ssl: config.ssl ? {
        ca: config.sslCaFile,
        cert: config.sslCertFile,
        key: config.sslKeyFile,
        rejectUnauthorized: config.sslRejectUnauthorized,
      } : undefined,
      socket: config.socketPathEnabled ? config.socketPath : undefined,
    },
    production: {
      adapter,
      database: config.domain,
      host: config.host,
      port: config.port,
      username: config.user,
      password: 'ENTER YOUR PASSWORD HERE',
      sslmode: config.ssl ? 'require' : 'disable',
      ssl: config.ssl ? {
        ca: config.sslCaFile,
        cert: config.sslCertFile,
        key: config.sslKeyFile,
        rejectUnauthorized: config.sslRejectUnauthorized,
      } : undefined,
      socket: config.socketPathEnabled ? config.socketPath : undefined,
    }
  };

  // Remove undefined properties
  const sanitizedConfig = JSON.parse(JSON.stringify(databaseYaml));

  return yaml.dump(sanitizedConfig);
}