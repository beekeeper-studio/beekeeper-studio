import { SchemaItem } from "@shared/lib/dialects/models"

export interface Template {
  name: string,
  schema: SchemaItem[],
}

export const idColumn: SchemaItem = {
  columnName: 'id',
  config: {
    dataType: 'int',
    nullable: false,
    primaryKey: true
  },
  dialectConfigs: {
    postgresql: {
      dataType: 'serial',
    },
    mysql: {
      special: "AUTO INCREMENT",
      dataType: 'int'
    },
    sqlserver: {
      special: "IDENTITY(1,1)",
      dataType: 'int'
    },
    sqlite: {
      dataType: 'integer',
      special: "AUTOINCREMENT"
    }
  }
}

export const timestampColumn = (name: string) => ({
  columnName: name,
  config: {
    dataType: 'varchar(255)',
    nullable: false,
  },
  dialectConfigs: {
    postgresql: {
      dataType: 'timestamp',
      special: 'DEFAULT NOW()'
    },
    mysql: {
      dataType: 'timestamp',
      special: 'DEFAULT CURRENT_TIMESTAMP',
    },
    sqlite: {
      dataType: 'datetime',
      special: 'DEFAULT CURRENT_TIMESTAMP'
    },
    sqlserver: {
      dataType: 'datetime',
      special: 'DEFAULT SYSUTCDATETIME()'
    }

  }
})

export const createdAtColumn: SchemaItem = timestampColumn('created_at')

export const updatedAtColumn: SchemaItem = timestampColumn('updated_at')
