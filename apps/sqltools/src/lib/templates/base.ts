import { Dialect, SchemaConfig, SchemaItem } from "@shared/lib/dialects/models"


export type DialectConfig = {
  [K in Dialect]: SchemaConfig
}

// this is similar to a schemaItem except it has configs for each database
export interface TemplatedSchemaItem {
  columnName: string
  config: SchemaConfig
  dialectConfigs?: DialectConfig
}

interface BasicProps {
  name: string,
  description: string,
  tableName: string
}

export class Template {
  name: string
  description: string
  tableName: string
  schema: TemplatedSchemaItem[]

  constructor(props: BasicProps, schema: TemplatedSchemaItem[]) {
    this.tableName = props.tableName
    this.name = props.name
    this.description = props.description
    this.schema = schema
  }

  toSchema(dialect: Dialect): SchemaItem[] {
    return this.schema.map((item) => {
      const c = item.config
      const dc = item.dialectConfigs?.[dialect]
      // this should overwrite config defaults
      // with values from the dialect config
      const config = { ...c, ...dc }
      return {
        columnName: item.columnName,
        ...config
      }
    })
  }
}

export const idColumn: TemplatedSchemaItem = {
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

export const createdAtColumn: TemplatedSchemaItem = timestampColumn('created_at')

export const updatedAtColumn: TemplatedSchemaItem = timestampColumn('updated_at')
