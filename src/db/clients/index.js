import mysql from './mysql';
import postgresql from './postgresql';
import sqlserver from './sqlserver';


/**
 * List of supported database clients
 */
export const CLIENTS = [
  {
    key: 'mysql',
    name: 'MySQL',
    defaultPort: 3306,
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
];


export default {
  mysql,
  postgresql,
  sqlserver,
};
