import yaml from 'js-yaml'
import { ConnectionTypes, ConnectionType } from "../../lib/db/types";
import { ISimpleConnection } from '@/common/interfaces/IConnection';

export function generateRubyDatabaseYaml(config: ISimpleConnection): string {
  const adapter = ConnectionTypes.find(conn => conn.name.toLowerCase() === config.connectionType.toLowerCase()) ?? 'postgresql'
  
  const databaseYaml: any = {
    development: {
      adapter,
      database: config.defaultDatabase,
      host: config.host,
      port: config.port,
      username: config.username,
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
      database: config.defaultDatabase ? `${config.defaultDatabase}_test` : undefined,
      host: config.host,
      port: config.port,
      username: config.username,
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
      database: config.defaultDatabase,
      host: config.host,
      port: config.port,
      username: config.username,
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

export function generateKnexConnection(config: ISimpleConnection): string {
  console.log(config)
  const client = mapConnectionTypeToKnexClient(config.connectionType);
  
  const knexConfig = `// Knex.js connection configuration
import knexLib from 'knex'
export const knex = knexLib({
  client: '${client}',
  connection: {
    host: '${config.host || 'localhost'}',
    port: ${config.port || getDefaultPortForType(config.connectionType)},
    user: '${config.username || ''}',
    password: 'ENTER YOUR PASSWORD HERE',
    database: '${config.defaultDatabase || ''}',
    ${config.ssl ? `
    ssl: {
      rejectUnauthorized: ${config.sslRejectUnauthorized},
      ${config.sslCaFile ? `ca: fs.readFileSync('${config.sslCaFile}'),` : ''}
      ${config.sslCertFile ? `cert: fs.readFileSync('${config.sslCertFile}'),` : ''}
      ${config.sslKeyFile ? `key: fs.readFileSync('${config.sslKeyFile}'),` : ''}
    },` : ''}
    ${config.socketPathEnabled && config.socketPath ? `socketPath: '${config.socketPath}',` : ''}
  },
  ${client === 'mysql' || client === 'mysql2' ? `pool: { min: 0, max: 7 },` : ''}
  debug: false,
});`;

  return knexConfig;
}

export function generateJdbcConnectionString(config: ISimpleConnection): string {
  const connectionType = config.connectionType;
  const host = config.host || 'localhost';
  const port = config.port || getDefaultPortForType(connectionType);
  const database = config.defaultDatabase || '';
  const user = config.username || '';
  const serviceName = config.serviceName || '';

  let jdbcUrl = '';
  let additionalProps = config.ssl ? '?ssl=true' : '';
  
  if (config.ssl && config.sslRejectUnauthorized === false) {
    additionalProps += (additionalProps ? '&' : '?') + 'sslmode=require&sslfactory=org.postgresql.ssl.NonValidatingFactory';
  }

  switch (connectionType) {
    case 'postgresql':
    case 'cockroachdb':
      jdbcUrl = `jdbc:postgresql://${host}:${port}/${database}${additionalProps}`;
      break;
    case 'mysql':
    case 'mariadb':
    case 'tidb':
      jdbcUrl = `jdbc:mysql://${host}:${port}/${database}${additionalProps}`;
      break;
    case 'sqlserver':
      jdbcUrl = `jdbc:sqlserver://${host}:${port};databaseName=${database}${additionalProps ? ';' + additionalProps.substring(1).replace(/&/g, ';') : ''}`;
      break;
    case 'oracle':
      if (serviceName) {
        jdbcUrl = `jdbc:oracle:thin:@//${host}:${port}/${serviceName}`;
      } else {
        jdbcUrl = `jdbc:oracle:thin:@${host}:${port}:${database}`;
      }
      break;
    case 'sqlite':
    case 'libsql':
      jdbcUrl = `jdbc:sqlite:${database}`;
      break;
    case 'redshift':
      jdbcUrl = `jdbc:redshift://${host}:${port}/${database}${additionalProps}`;
      break;
    default:
      jdbcUrl = `jdbc:${connectionType}://${host}:${port}/${database}`;
  }

  const connectionString = `// JDBC Connection String
String url = "${jdbcUrl}";
String user = "${user}";
String password = "ENTER YOUR PASSWORD HERE";

// Example connection code
Connection connection = DriverManager.getConnection(url, user, password);`;

  return connectionString;
}

export function generateSqlAlchemyConnection(config: ISimpleConnection): string {
  const connectionType = config.connectionType;
  const host = config.host || 'localhost';
  const port = config.port || getDefaultPortForType(connectionType);
  const database = config.defaultDatabase || '';
  const user = config.username || '';
  const serviceName = config.serviceName || '';
  
  let connectionUrl = '';
  let additionalImports = '';
  
  switch (connectionType) {
    case 'postgresql':
    case 'cockroachdb':
      connectionUrl = `postgresql://${user}:PASSWORD@${host}:${port}/${database}`;
      if (config.ssl) {
        additionalImports = 'import ssl\nfrom sqlalchemy import create_engine\n';
        connectionUrl += '?sslmode=require';
      }
      break;
    case 'mysql':
    case 'mariadb':
    case 'tidb':
      connectionUrl = `mysql+pymysql://${user}:PASSWORD@${host}:${port}/${database}`;
      break;
    case 'sqlserver':
      connectionUrl = `mssql+pyodbc://${user}:PASSWORD@${host}:${port}/${database}`;
      additionalImports = 'import pyodbc\n';
      break;
    case 'oracle':
      if (serviceName) {
        connectionUrl = `oracle+cx_oracle://${user}:PASSWORD@${host}:${port}/?service_name=${serviceName}`;
      } else {
        connectionUrl = `oracle+cx_oracle://${user}:PASSWORD@${host}:${port}/${database}`;
      }
      additionalImports = 'import cx_Oracle\n';
      break;
    case 'sqlite':
    case 'libsql':
      connectionUrl = `sqlite:///${database}`;
      break;
    case 'redshift':
      connectionUrl = `postgresql+psycopg2://${user}:PASSWORD@${host}:${port}/${database}`;
      break;
    default:
      connectionUrl = `${connectionType}://${user}:PASSWORD@${host}:${port}/${database}`;
  }

  let sslConfig = '';
  if (config.ssl && (connectionType === 'postgresql' || connectionType === 'cockroachdb')) {
    sslConfig = `\n# SSL Configuration
ssl_args = {
    'sslmode': 'require',
    ${config.sslRejectUnauthorized === false ? "'sslrootcert': None," : ""}
    ${config.sslCaFile ? `'sslrootcert': '${config.sslCaFile}',` : ""}
    ${config.sslCertFile ? `'sslcert': '${config.sslCertFile}',` : ""}
    ${config.sslKeyFile ? `'sslkey': '${config.sslKeyFile}',` : ""}
}
engine = create_engine(DATABASE_URL, connect_args=ssl_args)`;
  }

  const sqlAlchemyConfig = `${additionalImports}from sqlalchemy import create_engine, Column, Integer, String, MetaData, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database connection URL
DATABASE_URL = "${connectionUrl}"

# Create engine
${sslConfig || 'engine = create_engine(DATABASE_URL)'}

# Create session
Session = sessionmaker(bind=engine)
session = Session()

# Define models (example)
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)

# Create tables
Base.metadata.create_all(engine)

# Example query
users = session.query(User).all()
for user in users:
    print(user.name)`;

  return sqlAlchemyConfig;
}

export function generateConnectionString(config: ISimpleConnection): string {
  const connectionType = config.connectionType;
  const host = config.host || 'localhost';
  const port = config.port || getDefaultPortForType(connectionType);
  const database = config.defaultDatabase || '';
  const user = config.username || '';
  const serviceName = config.serviceName || '';
  const projectId = config.bigQueryOptions?.projectId || '';

  let connectionString = ''

  
  switch (connectionType) {
    case 'postgresql':
    case 'cockroachdb':
      connectionString = `postgresql://${user}:PASSWORD@${host}:${port}/${database}`;
      if (config.ssl) {
        connectionString += '?sslmode=require';
        if (config.sslRejectUnauthorized === false) {
          connectionString += '&sslmode=require';
        }
      }
      return connectionString;
    
    case 'mysql':
    case 'mariadb':
    case 'tidb':
      connectionString = `mysql://${user}:PASSWORD@${host}:${port}/${database}`;
      if (config.ssl) {
        connectionString += '?ssl=true';
      }
      return connectionString;
    
    case 'sqlserver':
      return `Server=${host},${port};Database=${database};User Id=${user};Password=PASSWORD;${config.trustServerCertificate ? 'TrustServerCertificate=True;' : ''}`;
    
    case 'oracle':
      if (serviceName) {
        return `${user}/PASSWORD@${host}:${port}/${serviceName}`;
      } else {
        return `${user}/PASSWORD@${host}:${port}:${database}`;
      }
    
    case 'sqlite':
    case 'libsql':
      return `sqlite:${database}`;
    
    case 'redshift':
      connectionString = `postgresql://${user}:PASSWORD@${host}:${port}/${database}`;
      if (config.ssl) {
        connectionString += '?sslmode=require';
      }
      return connectionString;
    
    case 'clickhouse':
      return `clickhouse://${user}:PASSWORD@${host}:${port}/${database}`;
    
    case 'cassandra':
      return `${host}:${port}/${database}`;
    
    case 'mongodb':
      return `mongodb://${user}:PASSWORD@${host}:${port}/${database}`;
      
    case 'bigquery':
      return `bigquery://${projectId}`;
      
    case 'duckdb':
      return `duckdb:${database}`;
      
    case 'firebird':
      return `${host}/${port}:${database}`;
    
    default:
      return `${connectionType}://${user}:PASSWORD@${host}:${port}/${database}`;
  }
}

function mapConnectionTypeToKnexClient(connectionType: ConnectionType): string {
  switch (connectionType) {
    case 'postgresql':
    case 'cockroachdb':
    case 'redshift':
      return 'pg';
    case 'mysql':
    case 'mariadb':
    case 'tidb':
      return 'mysql2';
    case 'sqlserver':
      return 'mssql';
    case 'sqlite':
    case 'libsql':
      return 'sqlite3';
    case 'oracle':
      return 'oracledb';
    default:
      return connectionType;
  }
}

function getDefaultPortForType(connectionType: ConnectionType): number {
  switch (connectionType) {
    case 'postgresql':
    case 'cockroachdb':
    case 'redshift':
      return 5432;
    case 'mysql':
    case 'mariadb':
    case 'tidb':
      return 3306;
    case 'sqlserver':
      return 1433;
    case 'oracle':
      return 1521;
    case 'cassandra':
      return 9042;
    case 'mongodb':
      return 27017;
    case 'clickhouse':
      return 9000;
    case 'firebird':
      return 3050;
    default:
      return 0;
  }
}