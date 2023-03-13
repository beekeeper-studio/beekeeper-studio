import { Dialect, PartitionExpressionChange, PartitionItem } from "@shared/lib/dialects/models";
import { PostgresData } from "@shared/lib/dialects/postgresql";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

const { wrapLiteral: wL, wrapIdentifier: wI, escapeString: wrapString } = PostgresData



export class PostgresqlChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'postgresql'
  wrapIdentifier = wI
  wrapLiteral = wL
  escapeString = wrapString

  createPartition(spec: PartitionItem) {
    const result = `
      CREATE TABLE ${spec.name}
      PARTITION OF ${this.tableName}
      ${spec.expression}
    `;

    return result;
  }

  createPartitions(specs: PartitionItem[]) {
    if (!specs?.length) return null;
    return specs.map((spec) => this.createPartition(spec)).join(';');
  }

  detachPartition(part: string) {
    const result = `
      ALTER TABLE ${this.tableName}
      DETACH PARTITION ${part}
    `;

    return result;
  }

  detachPartitions(partitions: string[]) {
    if (!partitions?.length) return null;
    return partitions.map((part) => this.detachPartition(part)).join(';');
  }

  alterPartition(alter: PartitionExpressionChange) {
    const detachPartition = this.detachPartition(alter.partitionName);
    
    const result = `
      ${detachPartition};
      ALTER TABLE ${this.tableName}
      ATTACH PARTITION ${alter.partitionName}
      ${alter.newValue}
    `;
    return result;
  }

  alterPartitions(alterations: PartitionExpressionChange[]) {
    if (!alterations?.length) return null;
    return alterations.map((alter) => this.alterPartition(alter)).join(';');
  }
}