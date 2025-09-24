import { Dialect, AlterTableSpec, CreateIndexSpec, CreateRelationSpec, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "./ChangeBuilderBase";
import { surrealEscapeString, surrealWrapLiteral } from "@shared/lib/dialects/surrealdb";

export class SurrealDBChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'surrealdb';

  wrapIdentifier(str: string): string {
    if (!str || str === '*') return str;

    // Match array indexes like field[0]
    const matched = str.match(/^(.*?)(\[[0-9]+\])$/);
    if (matched) {
      return this.wrapIdentifier(matched[1]) + matched[2];
    }

    // Escape backticks by doubling them, then wrap in backticks
    const escaped = str.replace(/`/g, '``');
    return `\`${escaped}\``;
  }

  wrapLiteral(str: string): string {
    return surrealWrapLiteral(str);
  }

  escapeString(str: string, quote?: boolean): string {
    return surrealEscapeString(str, quote);
  }

  // Override to use SurrealDB's DEFINE FIELD syntax
  addColumn(item: SchemaItem): string {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a field without name or data type");
    }

    const parts = [
      'DEFINE FIELD',
      this.wrapIdentifier(item.columnName),
      'ON TABLE',
      this.wrapIdentifier(this.table),
      'TYPE',
      item.dataType
    ];

    if (item.defaultValue) {
      parts.push('DEFAULT', this.wrapLiteral(item.defaultValue));
    }

    if (item.extra) {
      parts.push(item.extra);
    }

    return parts.join(' ');
  }

  // Override to use SurrealDB's REMOVE FIELD syntax
  dropColumn(column: string): string {
    return `REMOVE FIELD ${this.wrapIdentifier(column)} ON TABLE ${this.wrapIdentifier(this.table)}`;
  }

  // SurrealDB doesn't support direct column type alterations
  // Instead, we need to redefine the field
  alterType(column: string, newType: string): string {
    return `DEFINE FIELD ${this.wrapIdentifier(column)} ON TABLE ${this.wrapIdentifier(this.table)} TYPE ${newType}`;
  }

  // SurrealDB field default value redefinition
  alterDefault(column: string, newDefault: string | boolean | null): string {
    const baseDefine = `DEFINE FIELD ${this.wrapIdentifier(column)} ON TABLE ${this.wrapIdentifier(this.table)}`;
    
    if (newDefault === null) {
      // Remove default by redefining without it
      return `${baseDefine} TYPE any`; // We'd need to know the current type ideally
    } else {
      return `${baseDefine} TYPE any DEFAULT ${this.wrapLiteral(newDefault.toString())}`;
    }
  }

  // SurrealDB doesn't have nullable/not null concept like traditional SQL
  alterNullable(_column: string, _nullable: boolean): string {
    throw new Error('SurrealDB does not support nullable/not null constraints. Use optional types instead.');
  }

  // SurrealDB doesn't support renaming fields directly
  renameColumn(_column: string, _newName: string): string {
    throw new Error('SurrealDB does not support renaming fields directly. Create new field and remove old one.');
  }

  // SurrealDB doesn't support column comments
  setComment(_column: string, _newComment: string): string {
    throw new Error('SurrealDB does not support column comments.');
  }

  // Override to use SurrealDB's DEFINE INDEX syntax
  singleIndex(spec: CreateIndexSpec): string {
    if (!spec.columns?.length) {
      throw new Error("Indexes require at least one column");
    }

    const unique = spec.unique ? 'UNIQUE' : '';
    const indexName = spec.name ? this.wrapIdentifier(spec.name) : `idx_${this.table}_${spec.columns.map(c => c.name).join('_')}`;
    const columns = spec.columns.map(c => this.wrapIdentifier(c.name)).join(', ');

    return `DEFINE INDEX ${indexName} ON TABLE ${this.wrapIdentifier(this.table)} COLUMNS ${columns} ${unique}`.trim();
  }

  // Override to use SurrealDB's REMOVE INDEX syntax
  dropIndexes(drops: DropIndexSpec[]): string | null {
    if (!drops?.length) return null;

    return drops.map(spec => 
      `REMOVE INDEX ${this.wrapIdentifier(spec.name)} ON TABLE ${this.wrapIdentifier(this.table)}`
    ).join('; ');
  }

  // SurrealDB uses record links instead of foreign keys
  singleRelation(spec: CreateRelationSpec): string {
    const fromColumn = this.wrapIdentifier(spec.fromColumn);
    const toTable = this.wrapIdentifier(spec.toTable);
    
    // In SurrealDB, we define a field that references another table
    return `DEFINE FIELD ${fromColumn} ON TABLE ${this.wrapIdentifier(this.table)} TYPE record<${toTable}>`;
  }

  // SurrealDB doesn't have traditional foreign key constraints to drop
  dropRelations(_names: string[]): string | null {
    throw new Error('SurrealDB does not use traditional foreign key constraints. Modify field definitions instead.');
  }

  // Override the main alterTable method to handle SurrealDB's limitations
  alterTable(spec: AlterTableSpec): string {
    const statements: string[] = [];

    // Handle column additions
    if (spec.adds?.length) {
      statements.push(...this.addColumns(spec.adds));
    }

    // Handle column drops
    if (spec.drops?.length) {
      statements.push(...this.dropColumns(spec.drops));
    }

    // Handle column alterations (type changes, defaults)
    if (spec.alterations?.length) {
      const alterations = spec.alterations.map(item => {
        switch (item.changeType) {
          case 'dataType':
            return this.alterType(item.columnName, (item.newValue || '').toString());
          case 'defaultValue':
            return this.alterDefault(item.columnName, item.newValue);
          case 'nullable':
            // Skip nullable changes as they're not supported
            return null;
          case 'columnName':
            // Skip renames as they're not supported
            return null;
          default:
            return null;
        }
      }).filter(s => s !== null);
      
      statements.push(...alterations);
    }

    if (statements.length === 0) {
      return null;
    }

    const result = statements.join('; ');
    return result.endsWith(';') ? result : `${result};`;
  }

  // Column reordering is not supported in SurrealDB
  reorderColumns(): string {
    throw new Error('Column reordering is not supported in SurrealDB.');
  }
}