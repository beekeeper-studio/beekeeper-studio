import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { SavedConnection } from "./saved_connection";

@Entity({ name: 'connection_pins'})
export class PinnedConnection extends ApplicationEntity {

  constructor(connection: SavedConnection) {
    super();
    console.log('Connection: ', connection);
    if (!connection) return;
    this.connectionId = connection.id;
    this.workspaceId = connection.workspaceId;
  }

  @Column({type: 'float', nullable: false, default: 1})
  position: number = 99.0;

  @Column({type: 'integer', nullable: false})
  connectionId: number;

  @Column({type: 'integer', nullable: false, default: -1})
  workspaceId: number = -1;


  connection: SavedConnection;
}