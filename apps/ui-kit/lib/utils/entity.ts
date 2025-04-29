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
  return typeof entity.columns === 'undefined';
}
