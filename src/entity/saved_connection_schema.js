import { EntitySchema } from "typeorm"
import SavedConnection from '../models/saved_connection'

export const SavedConnectionSchema = new EntitySchema({
    name: "SavedConnection",
    target: SavedConnection,
    columns: {
      id: {
        primary: true,
        type: "int",
        generated: true
      },
      title: {
        type: 'varchar',
        length: 255
      },
      host: {
        type: 'varchar',
        length: 255,
        nullable: true
      },
      port: {
        type: 'int',
        nullable: true
      }
    }

})