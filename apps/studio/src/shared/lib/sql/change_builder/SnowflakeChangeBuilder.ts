import { CreateIndexSpec, Dialect, DropIndexSpec } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "./ChangeBuilderBase";
import { SnowflakeData } from "../../dialects/snowflake";

const { wrapIdentifier: wI, escapeString: eS, wrapLiteral: wL } = SnowflakeData;

export class SnowflakeChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'snowflake';
  wrapIdentifier = wI;
  wrapLiteral = wL;
  escapeString = eS;

  singleIndex(spec: CreateIndexSpec): string {
    const unique = spec.unique ? 'UNIQUE' : ''
    const name = spec.name ? this.dialectData.wrapIdentifier(spec.name) : ''
    const table = this.tableName
    if (!spec.columns?.length) {
      throw new Error("Indexes require at least one column")
    }
    const columns = spec.columns?.map((c) => {
      return this.dialectData.wrapIdentifier(c.name)
    });

    return `
      CREATE ${unique} INDEX ${name} on ${table}(${columns})
    `;
  }

  dropIndexes(drops: DropIndexSpec[]): string | null {
    if (!drops?.length) return null
    return drops.map((spec) => {
      const name = this.wrapIdentifier(spec.name)
      return `DROP INDEX ${name} on ${this.tableName}`
    }).join(';')
  }

}
