import { Dialect, PartitionItem } from "@shared/lib/dialects/models";
import { PostgresData } from "@shared/lib/dialects/postgresql";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

const { wrapLiteral: wL, wrapIdentifier: wI, escapeString: wrapString } = PostgresData



export class PostgresqlChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'postgresql'
  wrapIdentifier = wI
  wrapLiteral = wL
  escapeString = wrapString

  createPartition(spec: PartitionItem) {
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
    return specs.map((spec) => this.createPartition(spec)).join(';');
  }

  detachPartition(part: string) {
    const baseTable = this.tableName;

    const result = `
      ALTER TABLE ${baseTable}
      DETACH PARTITION ${part}
    `;

    return result;
  }

  detachPartitions(partitions: string[]) {
    if (!partitions?.length) return null;
    return partitions.map((part) => this.detachPartition(part)).join(';');
  }
}