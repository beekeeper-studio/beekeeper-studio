import { getDialectData } from "@shared/lib/dialects"
import { AlterTableSpec, Dialect, DialectTitles } from "@shared/lib/dialects/models"
import { now } from "@shared/lib/dialects/template"
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase"
import { MySqlChangeBuilder } from "@shared/lib/sql/change_builder/MysqlChangeBuilder"
import { PostgresqlChangeBuilder } from "@shared/lib/sql/change_builder/PostgresqlChangeBuilder"
import { RedshiftChangeBuilder } from "@shared/lib/sql/change_builder/RedshiftChangeBuilder"
import { SqliteChangeBuilder } from "@shared/lib/sql/change_builder/SqliteChangeBuilder"
import { SqlServerChangeBuilder } from "@shared/lib/sql/change_builder/SqlServerChangeBuilder"

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
  skip?: boolean // skip for this dialect
  beekeeperBlurb?: string
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

const existingColumns = [
  {
    columnName: 'important_column',
    dataType: 'varchar(255)'
  },
  {
    columnName: 'not_important_column',
    dataType: 'varchar(255)'
  },
  {
    columnName: 'birthdate',
    dataType: 'varchar(255)'
  },
  {
    columnName: 'last_name',
    dataType: 'varchar(255)'
  }
]

function getChangeBuilder(dialect: Dialect): ChangeBuilderBase {
  switch (dialect) {
    case 'postgresql':
      return new PostgresqlChangeBuilder("users", "public")
      break;
    case 'mysql':
      return new MySqlChangeBuilder("users", existingColumns)
    case 'sqlserver':
      return new SqlServerChangeBuilder("users", 'dbo', existingColumns, [])
    case 'sqlite':
      return new SqliteChangeBuilder('users')
    case 'redshift':
      return new RedshiftChangeBuilder('users')
    default:
      throw new Error("Unknown dialect")

  }
}


function buildExamples(dialect: Dialect, prefix: string): Example[] {

  function wrap(cAlter: string) {
    return `${prefix} ${cAlter}`
  }
  const title = DialectTitles[dialect]

  const nowText = now(dialect)

  const pBuilder = getChangeBuilder(dialect)
  const dData = getDialectData(dialect)

  const renameSpec: AlterTableSpec = {
    table: 'users',
    schema: 'dbo',
    alterations: [
      {
        columnName: 'last_name',
        newValue: 'family_name',
        changeType: 'columnName'
      }
    ]
  }

  const result: Example[] = [
    {
      id: 'alter-column-type',
      linkText: 'Alter Column Type',
      title: `${title} Alter Column Type Example`,
      description: `How to change a table column type in ${title}`,
      code: wrap(pBuilder.alterType('first_name', 'varchar(255)')),
      skip: dData.disabledFeatures?.alter?.alterColumn,
      beekeeperBlurb: "Access column editing by right-clicking on a table in the sidebar and clicking 'View Structure'."
    },
    {
      id: 'rename-column',
      linkText: 'Rename A Column',
      title: `${title} Rename Column Example`,
      description: `How to rename a table column in ${title}`,
      code: dialect === 'sqlserver' ? pBuilder.endSql(renameSpec) : wrap(pBuilder.renameColumn('last_name', 'family_name')),
      skip: dData.disabledFeatures?.alter?.renameColumn,
      beekeeperBlurb: "Access column renaming by right-clicking on a table in the sidebar and clicking 'View Structure'."

    },
    {
      id: 'alter-column-default',
      linkText: 'Alter Column Default',
      title: `${title} Alter Column Default Example`,
      description: `How to change a column's default value in ${title}`,
      skip: dData.disabledFeatures?.alter?.alterColumn,
      code: [
        {
          value: wrap(pBuilder.alterDefault('created_at', nowText)),
          title: "A common example for a created_at column - setting the default to the time that the record was created"
        },
        {
          value: wrap(pBuilder.alterDefault('first_name', "'Mateo'")),
          title: "Making the default value static"
        }
      ],
      beekeeperBlurb: "Access column editing by right-clicking on a table in the sidebar and clicking 'View Structure'."

    },
    {
      id: 'alter-column-nullable',
      linkText: 'Alter Column Nullable',
      title: `${title} Alter Column Nullable Example`,
      description: `How to change the nullable flag on a ${title} table column`,
      skip: dData.disabledFeatures?.alter?.alterColumn,
      code: [
        {
          value: wrap(pBuilder.alterNullable('important_column', false)),
          title: "Turning nullable off"
        },
        {
          value: wrap(pBuilder.alterNullable('not_important_column', true)),
          title: "Turning nullable on"
        }
      ],
      beekeeperBlurb: "Access column editing by right-clicking on a table in the sidebar and clicking 'View Structure'."
    },
    {
      id: 'alter-add-index',
      linkText: 'CREATE INDEX examples',
      title: `${title} CREATE INDEX examples`,
      description: `How to create an index on one (or many) columns in ${title}.`,
      skip: dData.disabledFeatures?.createIndex,
      code: [
        {
          value: wrap(pBuilder.createIndexes([{ name: 'fk_example_1', unique: true, columns: [{ name: 'first_name', order: 'ASC'}, { name: 'last_name', order: 'ASC'}]}])),
          title: 'Creating a simple compound index of two columns with a unique constraint. In this example the UNIQUE means that no two people can have the same first_name/last_name combination. Be careful with UNIQUE!'
        },
        {
          value: wrap(pBuilder.createIndexes([{ unique: false, columns: [{ name: 'created_at', order: 'DESC'}]}])),
          title: 'A simple index of record creation data. The descending order is useful for a lot of applications where you want to show the most recent items (eg blog posts, comments)'
        }
      ],
      beekeeperBlurb: "Access index editing by right-clicking on a table in the sidebar and clicking 'View Structure', then click 'Indexes' at the top."

    },
    {
      id: 'alter-table-add-fk',
      linkText: 'Alter Table Add Foreign Key',
      title: `${title} ALTER TABLE example - adding a foreign key constraint`,
      description: `Adding a foreign key (otherwise known as a relation or association) to a ${title} table means adding a 'constraint'. These basic examples assume that the column type is correct, and any existing values match existing relation IDs in the target table.`,
      skip: !!dData.disabledFeatures?.alter?.addConstraint,
      code: [
        {
          value: wrap(pBuilder.createRelations([{
            fromColumn: 'department_id',
            toTable: 'departments',
            toColumn: 'id',
          }])),
          title: "Creating a simple foreign key relation, Note we don't even need to specify the name of the constraint, the database will give us one automatically."
        },
        {
          value: wrap(pBuilder.createRelations([{
            fromColumn: 'department_id',
            toTable: 'departments',
            toColumn: 'id',
            constraintName: 'example_fk_1',
            onUpdate: 'NO ACTION',
            onDelete: 'CASCADE'
          }])),
          title: "In this example we're explicitly telling the database what action to take when a record is updated or deleted. CASCADE on delete is useful - it will will delete this record if the foreign key relation is deleted."
        }
      ],
      beekeeperBlurb: "Access foreign key editing by right-clicking on a table in the sidebar and clicking 'View Structure', then click 'Relations'."

    },
    {
      id: 'alter-table-drop-fk',
      linkText: 'Alter Table Drop Foreign Key / Constraint',
      title: `${title} How to remove a foreign key (or constraint) from an existing table`,
      description: `Removing a foreign key (otherwise known as a relation or association) from a ${title} table. Note that after removing a relation, you might also want to remove any left over indexes.`,
      skip: !!dData.disabledFeatures?.alter?.dropConstraint,
      code: pBuilder.dropRelations(['department_id_fk_constraint']),
      beekeeperBlurb: "Access foreign key editing by right-clicking on a table in the sidebar and clicking 'View Structure', then click 'Relations'."
    },
    {
      id: 'alter-table',
      linkText: 'Alter Table',
      title: `${title} Full Alter Table Example`,
      skip: dData.disabledFeatures?.alter?.alterColumn,
      description: `A ${title} example for changing, adding, and removing columns for an existing table`,
      code: pBuilder.alterTable(alterTableExampleSpec),
      beekeeperBlurb: "Access table column editing by right-clicking on a table in the sidebar and clicking 'View Structure'."

    }
  ]
  return result.filter((r) => !r.skip)
}

export const PostgresExamples: Example[] = buildExamples('postgresql', 'ALTER TABLE "users"')
export const SqlServerExamples = buildExamples('sqlserver', "ALTER TABLE [users]")
export const SqliteExamples = buildExamples('sqlite', 'ALTER TABLE "users"')
export const Mysqlexamples = buildExamples('mysql', 'ALTER TABLE `users`')
export const RedshiftExamples = buildExamples('redshift', 'ALTER TABLE "users"')