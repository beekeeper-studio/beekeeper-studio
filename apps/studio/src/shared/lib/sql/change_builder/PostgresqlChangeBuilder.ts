import { AlterPolicySpec, CreatePolicySpec, Dialect, DropIndexSpec, DropPolicySpec, PartitionExpressionChange, PartitionItem, PolicyCommand, PolicyCommands } from "@shared/lib/dialects/models";
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

  /**
   * The command lands in a keyword position, so it can only ever be one of the
   * known commands -- anything else falls back to postgres' own default.
   */
  private policyCommand(command?: string): PolicyCommand {
    const upper = `${command || ''}`.toUpperCase()
    return (PolicyCommands as string[]).includes(upper) ? upper as PolicyCommand : 'ALL'
  }

  /**
   * `TO` takes role names, but these four are keywords standing in for a role
   * and break if they get quoted.
   */
  private policyRole(role: string): string {
    const keywords = ['public', 'current_role', 'current_user', 'session_user']
    const trimmed = role.trim()
    return keywords.includes(trimmed.toLowerCase()) ? trimmed.toUpperCase() : this.wrapIdentifier(trimmed)
  }

  createPolicy(spec: CreatePolicySpec): string {
    const parts = [`CREATE POLICY ${this.wrapIdentifier(spec.name)} ON ${this.tableName}`]

    // PERMISSIVE and FOR ALL are postgres' defaults, but spelling them out keeps
    // the generated sql readable next to what the grid shows.
    if (spec.permissive === false) parts.push('AS RESTRICTIVE')
    parts.push(`FOR ${this.policyCommand(spec.command)}`)

    const roles = spec.roles?.length ? spec.roles : ['public']
    parts.push(`TO ${roles.map((r) => this.policyRole(r)).join(', ')}`)

    if (spec.using) parts.push(`USING (${this.wrapLiteral(spec.using)})`)
    if (spec.check) parts.push(`WITH CHECK (${this.wrapLiteral(spec.check)})`)

    return parts.join(' ')
  }

  createPolicies(specs: CreatePolicySpec[]): string | null {
    if (!specs?.length) return null
    return specs.map((spec) => this.createPolicy(spec)).join(';')
  }

  /**
   * Only the name, roles and expressions of a policy can change. Postgres has
   * no syntax for removing a USING or WITH CHECK expression, so an empty one is
   * left alone here and rejected by the caller instead.
   */
  alterPolicy(alter: AlterPolicySpec): string | null {
    const statements: string[] = []

    if (alter.newName && alter.newName !== alter.name) {
      statements.push(`ALTER POLICY ${this.wrapIdentifier(alter.name)} ON ${this.tableName} RENAME TO ${this.wrapIdentifier(alter.newName)}`)
    }

    const clauses: string[] = []
    if (alter.roles?.length) {
      clauses.push(`TO ${alter.roles.map((r) => this.policyRole(r)).join(', ')}`)
    }
    if (alter.using) {
      clauses.push(`USING (${this.wrapLiteral(alter.using)})`)
    }
    if (alter.check) {
      clauses.push(`WITH CHECK (${this.wrapLiteral(alter.check)})`)
    }

    if (clauses.length) {
      // The rename above runs first, so anything after it has to use the new name.
      const name = alter.newName || alter.name
      statements.push(`ALTER POLICY ${this.wrapIdentifier(name)} ON ${this.tableName} ${clauses.join(' ')}`)
    }

    return statements.length ? statements.join(';') : null
  }

  alterPolicies(alterations: AlterPolicySpec[]): string | null {
    if (!alterations?.length) return null
    const statements = alterations.map((alter) => this.alterPolicy(alter)).filter((s) => !!s)
    return statements.length ? statements.join(';') : null
  }

  dropPolicy(drop: DropPolicySpec): string {
    return `DROP POLICY ${this.wrapIdentifier(drop.name)} ON ${this.tableName}`
  }

  dropPolicies(drops: DropPolicySpec[]): string | null {
    if (!drops?.length) return null
    return drops.map((drop) => this.dropPolicy(drop)).join(';')
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
