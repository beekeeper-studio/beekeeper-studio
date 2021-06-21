import { createdAtColumn, idColumn, Template, updatedAtColumn } from "./base"

export const UserTemplate: Template = new Template({
  name: "Users",
  description: "A table of users for a website or app",
  tableName: "users"
}, [
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
      dataType: 'varchar(255)'
    }
  },
  createdAtColumn,
  updatedAtColumn
])
