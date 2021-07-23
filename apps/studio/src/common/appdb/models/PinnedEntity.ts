import _ from "lodash";
import { Column, Entity, ManyToOne } from "typeorm";
import { DatabaseEntity } from "../../../lib/db/models";
import { ApplicationEntity } from "./application_entity";
import { SavedConnection } from "./saved_connection";

function schemaMatch(a: string | null | undefined, b: string | null | undefined) {
  if (_.isNil(a) && _.isNil(b)) return true
  return a === b
}

@Entity({ name: 'pins'})
export class PinnedEntity extends ApplicationEntity {

  constructor(table?: DatabaseEntity, db?: string | null, saved?: SavedConnection) {
    super()
     if (table) {
      this.entityName = table.name
      this.schemaName = table.schema
      this.entityType = table.entityType
    }
    if (db) this.databaseName = db
    if (saved) this.savedConnection = saved
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

  @Column({type: 'boolean', default: false})
  open: boolean = false

  @Column({type: 'float', nullable: false, default: 1})
  position: number = 99.0

  // for saved connections
  @ManyToOne(() => SavedConnection, connection => connection.pinnedEntities, {nullable: true})
  savedConnection?: SavedConnection

  entity?: DatabaseEntity
}