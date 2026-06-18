import _ from "lodash";
import {
  ColumnType,
  createOrAlterRoutineDefinition,
  defaultConstraintActions,
  defaultEscapeString,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

const types = [
  ...SpecialTypes,
  'int', 'bigint', 'bit', 'decimal', 'money', 'numeric', 'smallint', 'smallmoney', 'tinyint', 'float', 'real', 'date', 'datetime2', 'datetime', 'datetimeoffset', 'smalldatetime', 'time', 'char', 'varchar', 'text', 'nchar', 'nvarchar', 'ntext', 'binary', 'image', 'varbinary', 'hierarchyid', 'sql_variant', 'timestamp', 'uniqueidentifier', 'xml', 'geometry', 'geography', 'rowversion'
]

const supportsLength = [
  'char', 'varchar', 'nvarchar', 'nchar', 'varbinary'
]

const defaultLength = (t: string) => t.includes('var') ? 255 : 8

export interface DefaultConstraint {
  name: string
  column: string
  schema: string
  table: string
}

const UNWRAPPER = /^"(.*)"$/

function sqlServerQualifiedName(routine: { name: string; schema?: string }): string {
  const wrap = (s: string) => `[${s.replace(/\]/g, ']]')}]`
  return routine.schema ? `${wrap(routine.schema)}.${wrap(routine.name)}` : wrap(routine.name)
}

function sqlServerRoutineExecute(routine: { name: string; schema?: string; type?: string; routineParams?: { name: string; type: string }[] }): string {
  const args = (routine.routineParams || [])
    .map((p) => {
      const paramName = p.name?.startsWith('@') ? p.name : `@${p.name}`
      return `${paramName} = /* ${p.type} */ NULL`
    })
    .join(', ')
  return `EXEC ${sqlServerQualifiedName(routine)}${args ? ' ' + args : ''};`
}

export const SqlServerData: DialectData = {
  sqlLabel: "SQL",
  defaultSchema: 'dbo',
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions],
  wrapIdentifier: (value) =>   _.isString(value) ?
    (value !== '*' ? `[${value.replace(/\]/g, ']]')}]` : '*') : value,
  editorFriendlyIdentifier: (s) => s,
  wrapLiteral: defaultWrapLiteral,
  requireDataset: false,
  importDataType: {
    stringType: 'varchar(255)',
    longStringType: 'nvarchar(max)',
    dateType: 'date',
    booleanType: 'bit',
    integerType: 'int',
    numberType: 'float',
    defaultType: 'varchar(255)'
  },
  disallowedSortColumns: ['geometry', 'xml'],
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  escapeString: defaultEscapeString,
  usesOffsetPagination: true,
  /**
   * Fix #1985 by using text/x-sql instead of text/x-mssql.
   * For some reason, text/x-mssql messes up the editor.getToken()
   * function which is used for autocomplete.
   **/
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    shell: true,
    alter: {
      multiStatement: true,
      renameSchema: true,
      reorderColumn: true,
    },
    informationSchema: {
      extra: true
    }
  },
  // sys.sql_modules returns a plain CREATE PROCEDURE/FUNCTION; rewrite it to
  // CREATE OR ALTER so saved edits update the routine in place.
  editableRoutineDefinition: createOrAlterRoutineDefinition,
  routineExecuteStatement: sqlServerRoutineExecute,

}
