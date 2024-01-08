import { IDbConnectionDatabase, IDbConnectionServer } from "../client";
import { MysqlClient } from "./mysql";

export class MariaDB extends MysqlClient {}

export default async function (
  server: IDbConnectionServer,
  database: IDbConnectionDatabase
) {
  const client = new MysqlClient(server, database);
  await client.connect();
  return client;
}
