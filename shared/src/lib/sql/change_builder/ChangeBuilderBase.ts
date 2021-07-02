import { AlterTableSpec } from "@shared/lib/dialects/models";





export abstract class ChangeBuilderBase {
  abstract alterTable(spec: AlterTableSpec): string
}