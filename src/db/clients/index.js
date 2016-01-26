import mysql from './mysql';
import postgresql from './postgresql';
import sqlserver from './sqlserver';


/**
 * List of supported database clients
 */
export const CLIENTS = [
  { key: 'mysql', name: 'MySQL' },
  { key: 'postgresql', name: 'PostgreSQL' },
  { key: 'sqlserver', name: 'Microsoft SQL Server' },
];


export default {
  mysql,
  postgresql,
  sqlserver,
};
