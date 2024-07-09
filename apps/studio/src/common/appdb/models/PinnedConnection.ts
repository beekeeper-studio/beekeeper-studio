import { TransportPinnedConn } from "@/common/transport/transport";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { SavedConnection } from "./saved_connection";

@Entity({ name: 'connection_pins'})
export class PinnedConnection extends ApplicationEntity {

  constructor(config: TransportPinnedConn | SavedConnection) {
    super();
    if (!config) return;
    if ("connectionId" in config) {
      PinnedConnection.merge(this, config);
    } else {
      this.connectionId = config.id;
      this.workspaceId = config.workspaceId;
    }
  }

  @Column({type: 'float', nullable: false, default: 1})
  position = 99.0;

  @Column({type: 'integer', nullable: false})
  connectionId: number;

  @Column({type: 'integer', nullable: false, default: -1})
  workspaceId = -1;
}
