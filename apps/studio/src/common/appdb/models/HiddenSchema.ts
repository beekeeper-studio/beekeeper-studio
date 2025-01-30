import { IConnection } from "@/common/interfaces/IConnection";
import { TransportHiddenSchema } from "@/common/transport/TransportHidden";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";

type InitInput = { name: string, db: string, saved: IConnection}

@Entity({ name: 'hidden_schemas'})
export class HiddenSchema extends ApplicationEntity {
  withProps(input: InitInput | TransportHiddenSchema): HiddenSchema {
    if (!input) return;
    if ("databaseName" in input) {
      // this shouldn't be necessary grrr
      HiddenSchema.merge(this, input as any);
      return this;
    }
    const { name, db, saved } = input;
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
