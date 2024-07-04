import { Transport, TransportPinnedConn } from "@/common/transport/transport";
import Vue from 'vue';
import { BaseUtilityAppDbEntity } from "./BaseUtilityAppDbEntity";
import { baseFind, baseFindOne } from "./Util";
import { IConnection } from "@/common/interfaces/IConnection";

export class PinnedConnection extends BaseUtilityAppDbEntity implements TransportPinnedConn {
  constructor(connection?: IConnection) {
    super('pinconn');

    if (!connection) return;

    this.connectionId = connection.id;
    this.workspaceId = connection.workspaceId;
  }

  static async find(options?: any): Promise<PinnedConnection[]> {
    return await baseFind('pinconn', options, PinnedConnection);
  }

  static async findOne(options?: any): Promise<PinnedConnection> {
    return await baseFindOne('pinconn', options, PinnedConnection);
  }

  static async save<T extends Transport>(entities: T[], options?: any): Promise<T[]> {
    return await Vue.prototype.$util.send('appdb/pinconn/save', { obj: entities, options });
  }

  id: number | null = null;
  position: number = 99.0;
  connectionId: number;
  workspaceId: number = -1;
  connection: IConnection;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
