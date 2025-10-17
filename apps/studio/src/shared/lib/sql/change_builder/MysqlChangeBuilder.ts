import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { MysqlData } from "@shared/lib/dialects/mysql";
import { CreateIndexSpec, Dialect, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import _ from 'lodash'
import { ExtendedTableColumn } from "@/lib/db/models";
import rawLog from '@bksLogger';

const log = rawLog.scope('MysqlChangeBuilder')

export class MySqlChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'mysql'
  existingColumns: SchemaItem[]
  wrapIdentifier = MysqlData.wrapIdentifier
  wrapLiteral = MysqlData.wrapLiteral
  escapeString = MysqlData.escapeString

  constructor(table: string, existingColumns: SchemaItem[]) {
    super(table)
    this.existingColumns = existingColumns
  }

  defaultValue(defaultValue) {
    // MySQL is a cluster when it comes to default values.
    if (!defaultValue) return null
    if (defaultValue === 'CURRENT_TIMESTAMP') return defaultValue
    if (defaultValue.toString().startsWith('(')) return defaultValue
    // string, already quoted
    if (defaultValue.startsWith("'")) return this.wrapLiteral(defaultValue)
    // string, not quoted.
    return this.escapeString(defaultValue.toString(), true);
  }

  singleIndex(spec: CreateIndexSpec): string {
    const unique = spec.unique ? 'UNIQUE' : ''
    const name = spec.name ? this.dialectData.wrapIdentifier(spec.name) : ''
    const table = this.tableName
    if (!spec.columns?.length) {
      throw new Error("Indexes require at least one column")
    }
    const columns = spec.columns?.map((c) => {
      if (!_.isNil(c.prefix)) {
        return `${this.dialectData.wrapIdentifier(c.name)} (${c.prefix}) ${c.order}`
      }
      return `${this.dialectData.wrapIdentifier(c.name)} ${c.order}`
    })
    return `
      CREATE ${unique} INDEX ${name} on ${table}(${columns})
    `
  }

  dropRelations(names: string[]): string | null {
    if (!names?.length) return null
    return names.map((name: string) => {
      const t = this.tableName
      const c = this.wrapIdentifier(name)
      return `ALTER TABLE ${t} DROP FOREIGN KEY ${c}`
    }).join(";")
  }

  dropIndexes(drops: DropIndexSpec[]): string | null {
    if (!drops?.length) return null
    return drops.map((spec) => {
      const name = this.wrapIdentifier(spec.name)
      return `DROP INDEX ${name} on ${this.tableName}`
    }).join(';')
  }

  ddl(existing: SchemaItem, updated: SchemaItem): string {
    const column = existing.columnName
    const newName = updated.columnName
    const nameChanged = column !== newName

    // mysql 5.7 only allows literal values except CURRENT_TIMESTAMP
    // mysql 8 allows literal values PLUS expressions like ('foo')
    // https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
    // it's very confusing.

    return [
      nameChanged ? `CHANGE` : 'MODIFY',
      this.wrapIdentifier(column),
      nameChanged ? this.wrapIdentifier(newName) : null,
      updated.dataType,
      updated.defaultValue ? `DEFAULT ${this.defaultValue(updated.defaultValue)}` : null,
      updated.nullable ? 'NULL' : 'NOT NULL',
      updated.extra,
      updated.comment ? `COMMENT ${this.escapeString(updated.comment, true)}` : null,
    ].filter((c) => !!c).join(" ")
  }

  getExisting(column: string) {
    const c: SchemaItem | undefined = this.existingColumns.find((c) => c.columnName === column)
    if (!c) {
      throw new Error(`Unable to find type for column ${column} in order to rename it`)
    }
    return c
  }

  buildUpdatedSchema(existing: SchemaItem, specs: SchemaItemChange[]) {
    let result = { ...existing }
    specs.forEach((spec) => {
      if (spec.changeType === 'columnName') result = { ...result, columnName: spec.newValue.toString()}
      if (spec.changeType === 'dataType') result = { ...result, dataType: spec.newValue.toString()}
      if (spec.changeType === 'defaultValue') result = { ...result, defaultValue: spec.newValue.toString()}
      if (spec.changeType === 'nullable') result = { ...result, nullable: !!spec.newValue}
      if (spec.changeType === 'comment') result = { ...result, comment: spec.newValue.toString()}
      if (spec.changeType === 'extra') result = { ...result, extra: spec.newValue.toString()}
    })
    return result
  }

  alterColumns(specs: SchemaItemChange[]) {
    const groupedByName = _.groupBy(specs, 'columnName')
    const existingGrouped = _.groupBy(this.existingColumns, 'columnName')

    return Object.keys(groupedByName).map((name) => {
      const changes = groupedByName[name];
      const existing = existingGrouped?.[name]?.[0];
      if (!existing) return null;
      const updated = this.buildUpdatedSchema(existing, changes)
      return this.ddl(existing, updated)
    }).filter((c)=> !!c)

  }

  renames() {
    // return nothing, do it all in alterColumns:
    return []
  }

  reorderColumns(oldColumnOrder: ExtendedTableColumn[], newColumnOrder: ExtendedTableColumn[]): string {
    log.info("COLUMN ORDER: ", oldColumnOrder, newColumnOrder)
    const newOrder = newColumnOrder.reduce((acc, NCO, index, arr) => {
      if ( oldColumnOrder.length < index + 1) return acc
      const { columnName, dataType, nullable, defaultValue, extra, generated } = NCO
      const { columnName: oldColumnName } = oldColumnOrder[index]
      if ( columnName !== oldColumnName) {
        // Skip generated columns - we don't have their generation expression
        // and cannot properly MODIFY them
        if (generated) {
          log.warn(`Skipping reordering of generated column: ${columnName}`)
          return acc
        }

        let columnDef = `${this.wrapIdentifier(columnName)} ${dataType}`;

        if (nullable === false) {
          columnDef += ' NOT NULL'
        }

        if (defaultValue !== undefined && defaultValue !== null) {
          columnDef += ` DEFAULT ${this.defaultValue(defaultValue)}`;
        }

        // Handle the 'extra' field:
        // Possible values in MySQL's information_schema.columns.extra:
        // - 'auto_increment' - VALID SQL, keep it
        // - 'on update CURRENT_TIMESTAMP' - VALID SQL, keep it
        // - 'DEFAULT_GENERATED' - metadata only, FILTER OUT
        // - 'STORED GENERATED' / 'VIRTUAL GENERATED' - shouldn't reach here (filtered by 'generated' flag)
        //
        // Multiple values can be combined, e.g., "DEFAULT_GENERATED on update CURRENT_TIMESTAMP"
        // We need to filter out only 'DEFAULT_GENERATED' while keeping valid SQL clauses.
        if (extra) {
          // Remove 'DEFAULT_GENERATED' (case-insensitive) but preserve everything else
          let processedExtra = extra.replace(/DEFAULT_GENERATED/gi, '');

          // Clean up extra whitespace
          processedExtra = processedExtra.replace(/\s+/g, ' ').trim();

          if (processedExtra) {
            columnDef += ` ${processedExtra}`;
          }
        }

        if (index === 0) {
          acc.push(`MODIFY ${columnDef} FIRST`)
        } else {
          acc.push(`MODIFY ${columnDef} AFTER ${this.wrapIdentifier(arr[index - 1].columnName)}`)
        }
      }

      return acc
    }, [])

    return (newOrder.length) ? `ALTER TABLE ${this.wrapIdentifier(this.table)} ${newOrder.join(',')};` : ''
  }

  alterComments() {
    // return nothing, do it all in alterColumns
    return []
  }

}
