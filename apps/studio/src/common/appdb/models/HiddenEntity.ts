import { IConnection } from "@/common/interfaces/IConnection";
import { TransportHiddenEntity } from "@/common/transport/TransportHidden";
import _ from "lodash";
import { Column, Entity } from "typeorm";
import { DatabaseEntity } from "../../../lib/db/models";
import { ApplicationEntity } from "./application_entity";

function schemaMatch(a: string | null | undefined, b: string | null | undefined) {
  if (_.isNil(a) && _.isNil(b)) return true
  return a === b
}

type InitInput = { table?: DatabaseEntity, db?: string | null, saved?: IConnection } 

@Entity({ name: 'hidden_entities'})
export class HiddenEntity extends ApplicationEntity {

  withProps(input: InitInput | TransportHiddenEntity): HiddenEntity {
    if (!input) return;
    if ("databaseName" in input) {
      HiddenEntity.merge(this, input as any);
      return this;
    }
    const { table, db, saved } = input;
    if (table) {
      this.entityName = table.name
      this.schemaName = table.schema
      this.entityType = table.entityType
    }
    if (db) this.databaseName = db
    if (saved) {
      this.connectionId = saved.id
      this.workspaceId = saved.workspaceId
    }
    return this;
  }

  matches(entity: DatabaseEntity, database?: string): boolean {
    return entity.name === this.entityName &&
      schemaMatch(entity.schema, this.schemaName) &&
      entity.entityType === this.entityType &&
      (!database || database === this.databaseName)
  }

  @Column({type: 'varchar', nullable: false})
  databaseName!: string

  @Column({type: 'varchar', nullable: true})
  schemaName?: string

  @Column({type: 'varchar', nullable: false})
  entityName!: string

  @Column({type: 'varchar', nullable: false})
  entityType: 'table' | 'view' | 'routine' | 'materialized-view'

  @Column({type: 'integer', nullable: false})
  connectionId: number

  @Column({type: 'integer', nullable: false, default: -1})
  workspaceId = -1
}
