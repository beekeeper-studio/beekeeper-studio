import { ChangeBuilderBase } from "./ChangeBuilderBase";
import { Dialect, SchemaItem } from "@shared/lib/dialects/models";

export class RedisChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = "postgresql";

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
    throw new Error("Not supported");
  }

  alterDefault(_column: string, _newDefault: string | null): string {
    throw new Error("Not supported");
  }

  alterNullable(_column: string, _nullable: boolean): string {
    throw new Error("Not supported");
  }

  addColumn(_item: SchemaItem): string {
    throw new Error("Not supported");
  }

  dropColumn(_column: string): string {
    throw new Error("Not supported");
  }
}
