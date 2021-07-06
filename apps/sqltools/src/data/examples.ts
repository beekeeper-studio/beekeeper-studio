import { now } from "@/lib/templates/base"
import { AlterTableSpec, Dialect, DialectTitles } from "@shared/lib/dialects/models"
import { PostgresqlChangeBuilder } from "@shared/lib/sql/change_builder/PostgresqlChangeBuilder"

interface CodeExample  {
  value: string
  title: string
}

export interface Example {
  id: string,
  linkText: string
  title: string
  description: string
  code: string | CodeExample[]
}

const alterTableExampleSpec: AlterTableSpec = {
  table: 'users',
  adds: [
    {
      columnName: 'last_name',
      dataType: 'varchar(255)',
      nullable: true,
      comment: 'Also known as family name'
    }
  ],
  drops: ['favorite_color'],
  alterations: [
    {
      columnName: 'first_name',
      changeType: 'dataType',
      newValue: 'varchar(255)'
    },
    {
      columnName: 'first_name',
      changeType: 'comment',
      newValue: "Don't make this column shorter, some people have long names!"
    },
    {
      columnName: 'birthdate',
      changeType: 'nullable',
      newValue: true,
    },
    {
      columnName: 'best_friend',
      changeType: 'defaultValue',
      newValue: "'The Kid Next Door'"
    }
  ]

}

const pBuilder = new PostgresqlChangeBuilder("users", "public")

function buildExamples(dialect: Dialect, prefix: string): Example[] {

  function wrap(cAlter: string) {
    return `${prefix} ${cAlter}`
  }
  const title = DialectTitles[dialect]

  const nowText = now(dialect)

  return [
    {
      id: 'alter-column-type',
      linkText: 'Alter Column Type',
      title: `${title} Alter Column Type Example`,
      description: `How to change a table column type in ${title}`,
      code: wrap(pBuilder.alterType('first_name', 'varchar(255)'))
    },
    {
      id: 'alter-column-default',
      linkText: 'Alter Column Default',
      title: `${title} Alter Column Default Example`,
      description: `How to change a column's default value in ${title}`,
      code: [
        {
          value: wrap(pBuilder.alterDefault('created_at', nowText)),
          title: "A common example for a created_at column - setting the default to the time that the record was created"
        },
        {
          value: wrap(pBuilder.alterDefault('first_name', "'Mateo'")),
          title: "Making the default value static"
        }
      ]
    },
    {
      id: 'alter-column-nullable',
      linkText: 'Alter Column Nullable',
      title: `${title} Alter Column Nullable Example`,
      description: `How to change the nullable flag on a ${title} table column`,
      code: [
        {
          value: wrap(pBuilder.alterNullable('important_column', false)),
          title: "Turning nullable off"
        },
        {
          value: wrap(pBuilder.alterNullable('not_important_column', true)),
          title: "Turning nullable on"
        }
      ]
    },
    {
      id: 'alter-table',
      linkText: 'Alter Table',
      title: `${title} Full Alter Table Example`,
      description: `A ${title} example for changing, adding, and removing columns for an existing table`,
      code: pBuilder.alterTable(alterTableExampleSpec)

    }
  ]
}

export const PostgresExamples: Example[] = buildExamples('postgresql', 'ALTER TABLE "users"')
export const SqlServerExamples = buildExamples('sqlserver', "ALTER TABLE [users]")
export const SqliteExamples = buildExamples('sqlite', 'ALTER TABLE "users"')
export const Mysqlexamples = buildExamples('mysql', 'ALTER TABLE `users`')
export const RedshiftExamples = buildExamples('redshift', 'ALTER TABLE "users"')