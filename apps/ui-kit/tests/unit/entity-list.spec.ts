import { expect, it } from "vitest";
import { Entity } from "../../lib/components/types";
import {
  createTreeItems,
  createRootItem,
} from "../../lib/components/entity-list/treeItems";

const root = createRootItem();

it("should generate items without schema", () => {
  const entities: Entity[] = [
    {
      name: "users",
      entityType: "table",
    },
    {
      name: "get_users",
      entityType: "routine",
      returnType: "table",
    },
  ];

  const items = createTreeItems(entities);

  expect(items).toHaveLength(2);
  expect(items[0]).toEqual({
    type: "table",
    key: "table..users",
    entity: entities[0],
    expanded: false,
    hidden: false,
    level: 0,
    pinned: false,
    loadingColumns: false,
    parent: root,
  });
  expect(items[1]).toEqual({
    type: "routine",
    key: "routine..get_users",
    entity: entities[1],
    expanded: false,
    hidden: false,
    level: 0,
    pinned: false,
    parent: root,
  });
});

it("should generate items with one schema", () => {
  const entities: Entity[] = [
    {
      name: "users",
      entityType: "table",
      schema: "public",
    },
    {
      name: "get_users",
      entityType: "routine",
      schema: "public",
      returnType: "table",
    },
  ];

  const items = createTreeItems(entities);

  expect(items).toHaveLength(2);
  expect(items[0]).toEqual({
    type: "table",
    key: "table.public.users",
    entity: entities[0],
    expanded: false,
    hidden: false,
    level: 0,
    pinned: false,
    loadingColumns: false,
    parent: root,
  });
  expect(items[1]).toEqual({
    type: "routine",
    key: "routine.public.get_users",
    entity: entities[1],
    expanded: false,
    hidden: false,
    level: 0,
    pinned: false,
    parent: root,
  });
});

it("should generate items with multiple schemas", () => {
  const entities: Entity[] = [
    {
      name: "users",
      entityType: "table",
      schema: "public",
    },
    {
      name: "schemata",
      entityType: "view",
      schema: "information_schema",
    },
  ];

  const items = createTreeItems(entities);

  expect(items).toHaveLength(4);
  expect(items[0]).toEqual({
    type: "schema",
    key: "schema.public",
    entity: { entityType: "schema", name: "public" },
    expanded: true,
    hidden: false,
    level: 0,
    pinned: false,
    parent: root,
  });
  expect(items[1]).toEqual({
    type: "table",
    key: "table.public.users",
    entity: entities[0],
    expanded: false,
    hidden: false,
    level: 1,
    pinned: false,
    loadingColumns: false,
    parent: items[0],
  });
  expect(items[2]).toEqual({
    type: "schema",
    key: "schema.information_schema",
    entity: { entityType: "schema", name: "information_schema" },
    expanded: false,
    hidden: false,
    level: 0,
    pinned: false,
    parent: root,
  });
  expect(items[3]).toEqual({
    type: "table",
    key: "view.information_schema.schemata",
    entity: entities[1],
    expanded: false,
    hidden: false,
    level: 1,
    pinned: false,
    loadingColumns: false,
    parent: items[2],
  });
});
