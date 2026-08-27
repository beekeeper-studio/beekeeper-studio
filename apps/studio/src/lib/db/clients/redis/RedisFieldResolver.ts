/**
 * Redis has no column types. These are the labels the client puts on the
 * virtual tables it builds, in `redis.ts`.
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { RedisQueryResult, ResultColumn } from "@/lib/db/clients/redis";

export class RedisFieldResolver extends FieldResolver<RedisQueryResult> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
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
