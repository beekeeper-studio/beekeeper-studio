import { PostgresClient } from "./postgresql";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";

export class GreengageClient extends PostgresClient {
  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(server, database);
  }
}
