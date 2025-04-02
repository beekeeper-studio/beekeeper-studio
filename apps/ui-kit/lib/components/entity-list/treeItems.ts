import _ from "lodash";
import { Item, RootItem, SchemaItem, TableItem, RoutineItem } from "./models";
import { Entity, TableEntity, RoutineEntity, SchemaEntity } from "../types";

const tableEntityTypes = [
  "table",
  "view",
  "materialized-view",
  "",
  undefined,
  null,
];

/** Useful for identifying an entity item in entity list */
export function idOf(entity: Entity) {
  if (entity.id) return entity.id;
  if (entity.entityType === "schema") return `schema.${entity.name}`;
  return `${entity.entityType}.${entity.schema ?? ''}.${entity.name}`;
}

export function createRootItem(): RootItem {
  return {
    type: "root",
    entity: {
      entityType: "schema",
      name: "",
    },
    key: "root",
    expanded: true,
    level: 0,
    pinned: false,
  };
}

export interface ItemState {
  expanded: boolean;
}

export type ItemStateType = keyof ItemState;

/** The key in this record is the id of a tree item. */
export type ItemStates = Record<string, ItemState>

export function createTreeItems(
  entities: Entity[],
  states: ItemStates = {}
) {
  const items = [] as Item[];
  const root = createRootItem();
  const groupedEntities = _.groupBy(
    entities,
    (entity) => entity["schema"] || ""
  );
  const schemaNames = Object.keys(groupedEntities);
  const mustCreateSchemaItem = schemaNames.length > 1;

  schemaNames.forEach((schemaName, idx) => {
    const entities = groupedEntities[schemaName];
    let schemaItem: SchemaItem;

    // 1. make a new schema folder
    if (mustCreateSchemaItem) {
      const schema: SchemaEntity = { name: schemaName, entityType: "schema" };
      schemaItem = createSchemaItem(schema, states, root);
      // First schema should be expanded
      if (idx === 0 && !states[schemaItem.key]) {
        schemaItem.expanded = true;
      }
      items.push(schemaItem);
    }

    // 2. make items that are inside that folder
    items.push(...itemsOf(entities, schemaItem ?? root, states));
  });

  return items;
}

function itemsOf(
  entities: Entity[],
  parent: SchemaItem | RootItem,
  states: ItemStates
): Item[] {
  const items = [] as Item[];

  entities.forEach((entity) => {
    switch (entity.entityType) {
      case "schema": {
        console.warn("Entity type schema is unsupported", entity);
        break;
      }
      case "routine": {
        items.push(createRoutineItem(entity, states, parent));
        break;
      }
      default: {
        if (!tableEntityTypes.includes(entity.entityType)) {
          console.warn("Unknown entity type", entity.entityType, entity);
          break;
        }
        items.push(createTableItem(entity, states, parent));
        break;
      }
    }
  });

  return items;
}

function createSchemaItem(
  entity: SchemaEntity,
  states: ItemStates,
  parent: RootItem
): SchemaItem {
  const key = idOf(entity);
  return {
    type: "schema",
    key,
    entity,
    parent,
    level: 0,
    expanded: states[key] ? states[key].expanded : false,
    pinned: states[key] ? states[key].pinned : false,
  };
}

function createTableItem(
  entity: TableEntity,
  states: ItemStates,
  parent: SchemaItem | RootItem
): TableItem {
  const key = idOf(entity);
  return {
    type: "table",
    key,
    entity,
    parent,
    level: parent.type === "schema" ? 1 : 0,
    loadingColumns: false,
    expanded: states[key] ? states[key].expanded : false,
    pinned: states[key] ? states[key].pinned : false,
  };
}

function createRoutineItem(
  entity: RoutineEntity,
  state: Record<string, ItemState>,
  parent: SchemaItem | RootItem
): RoutineItem {
  const key = idOf(entity);
  return {
    type: "routine",
    key,
    entity,
    parent,
    level: parent.type === "schema" ? 1 : 0,
    expanded: state[key] ? state[key].expanded : false,
    pinned: state[key] ? state[key].pinned : false,
  };
}
