import { IDbConnectionDatabase, IDbConnectionServer } from "../client";
import { MysqlClient } from "./mysql";

export class MariaDBClient extends MysqlClient {}

export default async function (
  server: IDbConnectionServer,
  database: IDbConnectionDatabase
) {
  const client = new MariaDBClient(server, database);
  await client.connect();
  return client;
}
