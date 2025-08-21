import { Entity, TableEntity } from "../components/types";

export function canHaveColumns(entity: Entity): entity is TableEntity {
  return (
    entity.entityType === "" ||
    entity.entityType === "table" ||
    entity.entityType === "view" ||
    entity.entityType === "materialized-view"
  );
}

export function shouldRequestColumns(entity: TableEntity) {
  return typeof entity.columns === "undefined";
}

export function matchEntity(a: Entity, b: Entity, defaultSchema?: string) {
  // same type
  if ((a.entityType || "table") !== (b.entityType || "table")) {
    return false;
  }

  // if both are schema, compare names
  if (a.entityType === "schema" || b.entityType === "schema") {
    return a.name === b.name;
  }

  // same schema
  if ((a.schema || defaultSchema) !== (b.schema || defaultSchema)) {
    return false;
  }

  // same name
  return (a.name === b.name);
}
