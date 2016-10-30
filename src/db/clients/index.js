import mysql from './mysql';
import postgresql from './postgresql';
import sqlserver from './sqlserver';
import cassandra from './cassandra';


/**
 * List of supported database clients
 */
export const CLIENTS = [
  {
    key: 'mysql',
    name: 'MySQL',
    defaultPort: 3306,
    disabledFeatures: [
      'server:schema',
    ],
  },
  {
    key: 'postgresql',
    name: 'PostgreSQL',
    defaultDatabase: 'postgres',
    defaultPort: 5432,
  },
  {
    key: 'sqlserver',
    name: 'Microsoft SQL Server',
    defaultPort: 1433,
  },
  {
    key: 'cassandra',
    name: 'Cassandra',
    defaultPort: 9042,
    disabledFeatures: [
      'server:ssl',
      'server:socketPath',
      'server:user',
      'server:password',
      'server:schema',
      'scriptCreateTable',
      'cancelQuery',
    ],
  },
];


export default {
  mysql,
  postgresql,
  sqlserver,
  cassandra,
};
