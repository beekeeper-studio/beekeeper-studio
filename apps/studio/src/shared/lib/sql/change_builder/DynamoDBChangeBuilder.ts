import { ChangeBuilderBase } from "./ChangeBuilderBase";
import { Dialect, SchemaItem } from "@shared/lib/dialects/models";

// DynamoDB doesn't use SQL for schema changes — index and table modifications go
// through native AWS SDK calls in the client. This builder only exists so the
// generic alter/rename plumbing in BasicDatabaseClient has something to call.
export class DynamoDBChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = "dynamodb";

  wrapIdentifier(value: string): string {
    return value;
  }

  wrapLiteral(value: string): string {
    return value;
  }

  escapeString(value: string): string {
    return value;
  }

  alterType(_column: string, _newType: string): string {
    throw new Error("DynamoDB does not support altering attribute types");
  }

  alterDefault(_column: string, _newDefault: string | null): string {
    throw new Error("DynamoDB does not support default values");
  }

  alterNullable(_column: string, _nullable: boolean): string {
    throw new Error("DynamoDB is schemaless");
  }

  addColumn(_item: SchemaItem): string {
    throw new Error("DynamoDB is schemaless; attributes are added per-item");
  }

  dropColumn(_column: string): string {
    throw new Error("DynamoDB is schemaless; attributes are removed per-item");
  }
}
