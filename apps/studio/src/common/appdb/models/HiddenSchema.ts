import { IConnection } from "@/common/interfaces/IConnection";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";

@Entity({ name: 'hidden_schemas'})
export class HiddenSchema extends ApplicationEntity {
  withProps(name: string, db: string, saved: IConnection): HiddenSchema {
    this.name = name
    if (db) this.databaseName = db
    if (saved) {
      this.connectionId = saved.id
      this.workspaceId = saved.workspaceId
    }

    return this;
  }

  matches(schemaName: string, database?: string): boolean {
    return schemaName === this.name &&
      (!database || database === this.databaseName)
  }

  @Column({type: 'varchar', nullable: false})
  name: string

  @Column({type: 'varchar', nullable: false})
  databaseName!: string

  @Column({type: 'integer', nullable: false})
  connectionId: number

  @Column({type: 'integer', nullable: false, default: -1})
  workspaceId = -1
}
