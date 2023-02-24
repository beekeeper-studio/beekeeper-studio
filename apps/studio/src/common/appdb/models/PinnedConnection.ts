import { IConnection } from "@/common/interfaces/IConnection";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";

@Entity({ name: 'connection_pins'})
export class PinnedConnection extends ApplicationEntity {

  constructor(connection: IConnection) {
    super();
    this.connectionId = connection.id;
    this.workspaceId = connection.workspaceId;
  }

  @Column({type: 'float', nullable: false, default: 1})
  position: number = 99.0;

  @Column({type: 'integer', nullable: false})
  connectionId: number;

  @Column({type: 'integer', nullable: false, default: -1})
  workspaceId: number = -1;


  connection: IConnection;
}