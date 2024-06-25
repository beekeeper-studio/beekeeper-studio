import { TransportPinnedConn } from "@/common/transport/transport";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { SavedConnection } from "./saved_connection";

@Entity({ name: 'connection_pins'})
export class PinnedConnection extends ApplicationEntity {

  constructor(config: TransportPinnedConn) {
    super();
    if (!config) return;
    PinnedConnection.merge(this, config);
  }

  @Column({type: 'float', nullable: false, default: 1})
  position = 99.0;

  @Column({type: 'integer', nullable: false})
  connectionId: number;

  @Column({type: 'integer', nullable: false, default: -1})
  workspaceId = -1;


  connection: SavedConnection;
}
