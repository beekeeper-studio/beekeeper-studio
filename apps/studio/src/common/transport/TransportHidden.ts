import { DatabaseEntity } from "@/lib/db/models";
import { Transport } from ".";
import _ from "lodash";

function schemaMatch(a: string | null | undefined, b: string | null | undefined) {
  if (_.isNil(a) && _.isNil(b)) return true
  return a === b
}

export interface TransportHiddenEntity extends Transport {
  databaseName: string,
  schemaName?: string,
  entityName: string,
  entityType: 'table' | 'view' | 'routine' | 'materialized-view',
  connectionId: number,
  workspaceId: number
}

export interface TransportHiddenSchema extends Transport {
  name: string,
  databaseName: string,
  connectionId: number,
  workspaceId: number
}

export function matches(obj: TransportHiddenEntity, entity: DatabaseEntity, database?: string): boolean {
  return entity.name === obj.entityName &&
    schemaMatch(entity.schema, obj.schemaName) &&
    entity.entityType === obj.entityType &&
    (!database || database === obj.databaseName);
}

export function matchesSchema(obj: TransportHiddenSchema, schemaName: string, database?: string): boolean {
  return schemaName === obj.name &&
    (!database || database === obj.databaseName);
}
