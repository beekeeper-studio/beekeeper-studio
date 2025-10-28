import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { MysqlData } from "@shared/lib/dialects/mysql";
import { CreateIndexSpec, Dialect, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import _ from 'lodash'
import { ExtendedTableColumn } from "@/lib/db/models";
import rawLog from '@bksLogger';

const log = rawLog.scope('MysqlChangeBuilder')

export class MySqlChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'mysql'
  existingColumns: ExtendedTableColumn[]
  wrapIdentifier = MysqlData.wrapIdentifier
  wrapLiteral = MysqlData.wrapLiteral
  escapeString = MysqlData.escapeString

  constructor(table: string, existingColumns: ExtendedTableColumn[]) {
    super(table)
    this.existingColumns = existingColumns
  }

  defaultValue(defaultValue, isGenerated: boolean = false) {
    // MySQL is a cluster when it comes to default values.
    if (!defaultValue) return null
    if (defaultValue === 'CURRENT_TIMESTAMP') return defaultValue
    if (defaultValue.toString().startsWith('(')) return defaultValue
    // string, already quoted
    if (defaultValue.startsWith("'")) return this.wrapLiteral(defaultValue)
    // is a generated expression, so don't quote
    if (isGenerated) return `(${defaultValue.replace(/\\'/g, "'")})`;
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

  ddl(existing: ExtendedTableColumn, updated: SchemaItem): string {
    const column = existing.columnName
    const newName = updated.columnName
    const nameChanged = column !== newName

    // mysql 5.7 only allows literal values except CURRENT_TIMESTAMP
    // mysql 8 allows literal values PLUS expressions like ('foo')
    // https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
    // it's very confusing.
    let characterSet = null;
    if (existing.characterSet) {
      characterSet = `CHARACTER SET ${existing.characterSet}`;
    }

    let collation = null;
    if (existing.collation) {
      collation = `COLLATE ${existing.collation}`;
    }

    let extra = updated.extra;
    let generationExpression = null;
    let defaultValue = updated.defaultValue;
    let defaultGenerated = false;

    if (existing.generated && existing.generationExpression) {
      const isStored = /STORED GENERATED/gi.test(extra);
      // MySQL stores generation expressions with escaped quotes, we need to unescape them
      let unescapedExpression = existing.generationExpression.replace(/\\'/g, "'");

      generationExpression = `GENERATED ALWAYS AS (${unescapedExpression}) ${isStored ? 'STORED' : 'VIRTUAL'}`;
      extra = null;
      defaultValue = null; // Generated columns cannot have explicit default values
    } else if (extra) {
      const expr = /DEFAULT_GENERATED/gi;
      if (expr.test(extra)) {
        extra = extra.replace(expr, '').replace(/\s+/g, ' ').trim();
        defaultGenerated = true;
      }
      if (!extra) extra = null;
    }

    // For generated columns, we should not include NULL/NOT NULL after the generation expression
    // The correct order is: data type, charset, collation, generation expression, then comment
    const parts = [
      nameChanged ? `CHANGE` : 'MODIFY',
      this.wrapIdentifier(column),
      nameChanged ? this.wrapIdentifier(newName) : null,
      updated.dataType,
      characterSet,
      collation,
    ];

    if (generationExpression) {
      // For generated columns: just the generation expression and comment
      parts.push(generationExpression);
      if (updated.comment) {
        parts.push(`COMMENT ${this.escapeString(updated.comment, true)}`);
      }
    } else {
      // For regular columns: default, null/not null, extra, comment
      if (defaultValue) {
        parts.push(`DEFAULT ${this.defaultValue(defaultValue, defaultGenerated)}`);
      }
      parts.push(updated.nullable ? 'NULL' : 'NOT NULL');
      if (extra) {
        parts.push(extra);
      }
      if (updated.comment) {
        parts.push(`COMMENT ${this.escapeString(updated.comment, true)}`);
      }
    }

    return parts.filter((c) => !!c).join(" ")
  }

  getExisting(column: string) {
    const c: SchemaItem | undefined = this.existingColumns.find((c) => c.columnName === column)
    if (!c) {
      throw new Error(`Unable to find type for column ${column} in order to rename it`)
    }
    return c
  }

  buildUpdatedSchema(existing: ExtendedTableColumn, specs: SchemaItemChange[]) {
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
      const { columnName, dataType, nullable, defaultValue, extra, generated, generationExpression, comment, characterSet, collation } = NCO
      const { columnName: oldColumnName } = oldColumnOrder[index]
      if ( columnName !== oldColumnName) {
        let columnDef = `${this.wrapIdentifier(columnName)} ${dataType}`;

        if (characterSet) {
          columnDef += ` CHARACTER SET ${characterSet}`;
        }

        if (collation) {
          columnDef += ` COLLATE ${collation}`;
        }

        if (nullable === false) {
          columnDef += ' NOT NULL'
        }

        if (!_.isNil(defaultValue)) {
          const isGenerated = /DEFAULT_GENERATED/gi.test(extra);
          columnDef += ` DEFAULT ${this.defaultValue(defaultValue, isGenerated)}`;
        }

        if (extra && !generated) {
          let processedExtra = extra.replace(/DEFAULT_GENERATED/gi, '');

          // Clean up extra whitespace
          processedExtra = processedExtra.replace(/\s+/g, ' ').trim();

          if (processedExtra) {
            columnDef += ` ${processedExtra}`;
          }
        } else if (generated && generationExpression) {
          const isStored = /STORED GENERATED/gi.test(extra);
          // MySQL stores generation expressions with escaped quotes, we need to unescape them
          let unescapedExpression = generationExpression.replace(/\\'/g, "'");

          if (!unescapedExpression.startsWith('(')) {
            unescapedExpression = `(${unescapedExpression})`;
          }
          columnDef += ` GENERATED ALWAYS AS (${unescapedExpression}) ${isStored ? 'STORED' : 'VIRTUAL'}`;
        }

        if (comment) {
          columnDef += ` COMMENT ${this.escapeString(comment, true)}`;
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
