import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { RedisQueryResult } from "@/lib/db/clients/redis";

export class RedisFieldResolver extends FieldResolver<RedisQueryResult> {
  protected resolveRuntimeColumnType(column: {
    name: string;
    type?: string;
  }): BksFieldType {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    switch (rawType?.toLowerCase()) {
      case "text":
      case "json":
        return "STRING";
      case "integer":
        return "NUMBER";
      default:
        return "UNKNOWN";
    }
  }
}
