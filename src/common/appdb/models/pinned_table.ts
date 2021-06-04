import { Column, Entity, ManyToOne } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { SavedConnection } from "./saved_connection";





@Entity({ name: 'pinned_table'})
export class PinnedTable extends ApplicationEntity {


  @Column({type: 'varchar', nullable: false})
  databaseName!: string

  @Column({type: 'varchar', nullable: true})
  schemaName?: string

  @Column({type: 'varchar', nullable: false})
  tableName!: string

  @Column({type: 'bool', default: false})
  open?: boolean

  @ManyToOne(() => SavedConnection, connection => connection.pinnedTables)
  savedConnection!: SavedConnection
}