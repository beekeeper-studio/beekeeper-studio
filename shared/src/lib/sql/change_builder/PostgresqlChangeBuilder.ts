import { Dialect, PartitionItem } from "@shared/lib/dialects/models";
import { PostgresData } from "@shared/lib/dialects/postgresql";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

const { wrapLiteral: wL, wrapIdentifier: wI, escapeString: wrapString } = PostgresData



export class PostgresqlChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'postgresql'
  wrapIdentifier = wI
  wrapLiteral = wL
  escapeString = wrapString

  singlePartition(spec: PartitionItem) {
    const baseTable = this.tableName;
    const childTable = spec.name;
    const expression = spec.expression;

    const result = `
      CREATE TABLE ${childTable}
      PARTITION OF ${baseTable}
      ${expression}
    `;

    return result;
  }

  createPartitions(specs: PartitionItem[]) {
    if (!specs?.length) return null;
    return specs.map((spec) => this.singlePartition(spec)).join(';');
  }
}