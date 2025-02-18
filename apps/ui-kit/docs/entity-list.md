# @bks/ui-kit Entity List

An Entity List component is a component for displaying a list of database
entities or objects in a tree structure that can be expanded and collapsed.

## Basic Usage

An entity list gets its data from the `entities` property, which is an array
of Entity objects.

```html
<bks-entity-list></bks-entity-list>
<script>
  const entities = [
    {
      name: "users",
      columns: [
        { field: "id", dataType: "integer" },
        { field: "name", dataType: "string" },
      ],
    },
  ];
  const entityList = document.querySelector("bks-entity-list");
  entityList.entities = entities;
</script>
```

An entity doesn't require you to provide all props. You can simply put a `name`
prop to make a table entity.

```js
const entities = [{ name: "users" }, { name: "orders" }]
```

You can provide a `schema` prop as a string to the entity objects and they
will be displayed inside a schema folder.

```js
const entities = [
  {
    name: "users",
    schema: "public",
  },
  {
    name: "orders",
    schema: "public",
  },
];
```

It also recognizes other entity types such as `view`, `materialized-view`, and
`routine` entities.

```js
const entities = [
  {
    name: "users",
    entityType: "table", // default
  },
  {
    name: "order_summary",
    entityType: "view",
  },
  {
    name: "order_summary_2",
    entityType: "materialized-view",
  },
  {
    name: "get_order",
    entityType: "routine",
    returnType: "integer",
    type: "function",
  },
]
```

## Hiding

Essentially, hiding an entity can be done by simply filtering the array of
`entities` property before passing it to the component.

Our implementation provides UI hints and a modal for unhiding an entity.
To enable this functionality, set the `hiddenEntities` property to an array of
entity objects that you wish to hide. These objects must be the same references
as those in the entities property.

```js
const users = { ... }
const orders = { ... }
const entities = [users, orders]
const hiddenEntities = [orders]

entityList.entities = entities
entityList.hiddenEntities = hiddenEntities
entityList.addEventListener('bks-entity-unhide', (event) => {
  const entity = event.detail.entity
  const entities = hiddenEntities.filter((hiddenEntity) => hiddenEntity !== entity)
  entityList.hiddenEntities = entities
})
```

## Pinning

To pin an entity, set the `enablePinning` property to `true` and `pinnedEntities`
property to an array of objects. These object should have the same reference
as the ones in the `entities` property.

```js
const users = { ... }
const orders = { ... }
const entities = [users, orders]
const pinnedEntities = [orders]

entityList.entities = entities
entityList.pinnedEntities = orders
entityList.enablePinning = true
entityList.addEventListener('bks-entity-pin', (event) => {
  const entity = event.detail.entity
  const entities = pinnedEntities.concat(entity)
  entityList.pinnedEntities = entities
})
entityList.addEventListener('bks-entity-unpin', (event) => {
  const entity = event.detail.entity
  const entities = pinnedEntities.filter((pinnedEntity) => pinnedEntity !== entity)
  entityList.pinnedEntities = entities
})
```

## Lazy Loading Columns

If a entity entity doesn\'t have a `columns` property, or its value is `undefined`,
the component will emit the `bks-entities-request-columns` event when the entity
is expanded. An entity can be expanded by clicking the expand icon next to the
entity icon, or by clicking the expand all icon in the top right corner.

```js
entityList.addEventListener("bks-entities-request-columns", (event) => {
  const entities = event.detail.entities;
  // Load the columns here ...
});
```

Entity List also supports virtual rendering, so if there are a large number of
entities and all entities are expanded at once, it will only request for
entities that are in the DOM which is a reasonable amount.

This will work for other table-like entities (views and materialized views).

If you wish to stop the event from being emitted, you can set the `columns`
property to `[]` (an empty array).

## Context Menu
