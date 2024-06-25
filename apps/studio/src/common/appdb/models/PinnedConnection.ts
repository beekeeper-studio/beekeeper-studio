import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { SavedConnection } from "./saved_connection";

@Entity({ name: 'connection_pins'})
export class PinnedConnection extends ApplicationEntity {

  // TODO (@day): this should just be an IConnection
  constructor(connection: SavedConnection) {
    super();
    if (!connection) return;
    this.connectionId = connection.id;
    this.workspaceId = connection.workspaceId;
  }

  @Column({type: 'float', nullable: false, default: 1})
  position = 99.0;

  @Column({type: 'integer', nullable: false})
  connectionId: number;

  @Column({type: 'integer', nullable: false, default: -1})
  workspaceId = -1;


  connection: SavedConnection;
}
