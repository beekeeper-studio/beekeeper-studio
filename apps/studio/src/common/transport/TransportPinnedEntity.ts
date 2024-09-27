import { DatabaseEntity } from "@/lib/db/models";
import { Transport } from ".";
import _ from "lodash";

function schemaMatch(a: string | null | undefined, b: string | null | undefined) {
  if (_.isNil(a) && _.isNil(b)) return true;
  return a === b;
}

export function matches(obj: TransportPinnedEntity, entity: DatabaseEntity, database?: string): boolean {
  return entity.name === obj.entityName &&
    schemaMatch(entity.schema, obj.schemaName) &&
    entity.entityType === obj.entityType &&
    (!database || database === obj.databaseName);
}

export interface TransportPinnedEntity extends Transport {
  databaseName: string,
  schemaName?: string,
  entityName: string,
  entityType: 'table' | 'view' | 'routine' | 'materialized-view',
  open: boolean,
  position: number,
  connectionId: number,
  workspaceId: number,
  entity: DatabaseEntity
}
