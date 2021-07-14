import { Column, Entity, ManyToOne } from "typeorm";
import { TableOrView } from "../../../lib/db/models";
import { ApplicationEntity } from "./application_entity";
import { SavedConnection } from "./saved_connection";


@Entity({ name: 'pinned_tables'})
export class PinnedTable extends ApplicationEntity {

  constructor(table?: TableOrView, db?: string | null, saved?: SavedConnection) {
    super()
    console.log('initializing with', table, db, saved)
    if (table) {
      this.table = table
      this.tableName = table.name
      this.schemaName = table.schema
    }
    if (db) this.databaseName = db
    if (saved) this.savedConnection = saved
  }

  matches(table: TableOrView, database?: string): boolean {
    return table.name === this.tableName &&
      table.schema === this.schemaName &&
      (!database || database === this.databaseName)
  }


  @Column({type: 'varchar', nullable: false})
  databaseName!: string

  @Column({type: 'varchar', nullable: true})
  schemaName?: string

  @Column({type: 'varchar', nullable: false})
  tableName!: string

  @Column({type: 'boolean', default: false})
  open: boolean = false

  @Column({type: 'float', nullable: false, default: 1})
  position: number = 99.0

  // for saved connections
  @ManyToOne(() => SavedConnection, connection => connection.pinnedTables, {nullable: true})
  savedConnection?: SavedConnection

  table?: TableOrView
}