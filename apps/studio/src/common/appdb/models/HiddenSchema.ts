import { IConnection } from "@/common/interfaces/IConnection";
import { TransportHiddenSchema } from "@/common/transport/TransportHidden";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";

type InitInput = { name: string, db: string, saved: IConnection}

@Entity({ name: 'hidden_schemas'})
export class HiddenSchema extends ApplicationEntity {
  constructor(input: InitInput | TransportHiddenSchema) {
    super()
    if (!input) return;
    if ("databaseName" in input) {
      HiddenSchema.merge(this, input);
      return;
    }
    const { name, db, saved } = input;
    this.name = name
    if (db) this.databaseName = db
    if (saved) {
      this.connectionId = saved.id
      this.workspaceId = saved.workspaceId
    }
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
