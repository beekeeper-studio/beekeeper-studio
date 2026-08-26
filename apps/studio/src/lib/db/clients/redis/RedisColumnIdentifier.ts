import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksFieldType } from "@/lib/db/models";
import { RedisQueryResult } from "@/lib/db/clients/redis";

export class RedisColumnIdentifier extends ColumnIdentifier<RedisQueryResult> {
  protected identifyResultColumnType(column: {
    name: string;
    type?: string;
  }): BksFieldType {
    return this.identifyType(column.type);
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
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
