import { createdAtColumn, idColumn, Template, updatedAtColumn } from "./base"

export const UserTemplate: Template = {
  name: "users",
  schema: [
    idColumn,
    {
      columnName: 'first_name',
      config: {
        dataType: 'varchar(255)',
        nullable: true,
      }
    },
    {
      columnName: 'last_name',
      config: {
        dataType: 'varchar(255)',
        nullable: true
      }
    },
    {
      columnName: 'email',
      config: {
        nullable: false,
        dataType: 'varchar'
      }
    },
    createdAtColumn,
    updatedAtColumn
  ]
}

