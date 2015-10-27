import url from 'url';


export default {
  postgresql: {
    host: url.parse(process.env.POSTGRES_PORT).hostname,
    port: parseInt(url.parse(process.env.POSTGRES_PORT).port, 10),
    user: process.env.POSTGRES_ENV_POSTGRES_USER,
    password: process.env.POSTGRES_ENV_POSTGRES_PASSWORD,
    database: process.env.POSTGRES_ENV_POSTGRES_DB,
  },
  mysql: {
    host: url.parse(process.env.MYSQL_PORT).hostname,
    port: parseInt(url.parse(process.env.MYSQL_PORT).port, 10),
    user: process.env.MYSQL_ENV_MYSQL_USER,
    password: process.env.MYSQL_ENV_MYSQL_PASSWORD,
    database: process.env.MYSQL_ENV_MYSQL_DATABASE,
  },
};
