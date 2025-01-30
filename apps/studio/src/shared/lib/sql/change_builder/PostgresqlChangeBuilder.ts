import { Dialect, DropIndexSpec, PartitionExpressionChange, PartitionItem } from "@shared/lib/dialects/models";
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
      CREATE TABLE ${this.wrapIdentifier(spec.name)}
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
      DETACH PARTITION ${this.wrapIdentifier(part)}
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
      ATTACH PARTITION ${this.wrapIdentifier(alter.partitionName)}
      ${alter.newValue}
    `;
    return result;
  }

  alterPartitions(alterations: PartitionExpressionChange[]) {
    if (!alterations?.length) return null;
    return alterations.map((alter) => this.alterPartition(alter)).join(';');
  }

  dropIndexes(drops: DropIndexSpec[]): string | null {
    if (!drops?.length) return null

    const names = drops.map((spec) => {
      if (this.schema) {
        return `${this.dialectData.wrapIdentifier(this.schema)}.${this.dialectData.wrapIdentifier(spec.name)}`
      }
      return this.dialectData.wrapIdentifier(spec.name)
    }).join(",")
    return names.length ? `DROP INDEX ${names}` : null
  }
}
