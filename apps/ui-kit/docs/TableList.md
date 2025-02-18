# @bks/ui-kit Table List

A Table List component is a component for displaying a list of database objects or entities in a tree structure that can be expanded and collapsed.

## Basic Usage

The component gets its data from the `tables` property, which is an array of objects.

```html
<bks-table-list></bks-table-list>
<script>
  const tableList = document.querySelector("bks-table-list");
  tableList.tables = [
    {
      name: "users",
      schema: "public",
      columns: [
        { field: "id", dataType: "integer" },
        { field: "name", dataType: "string" },
      ],
    },
  ];
</script>
```

## Hiding

Essentially, hiding an entity can be done by simply filtering the array of `tables`
property before passing it to the component.

Our implementation provides UI hints and a modal for unhiding an entity.
To enable this functionality, set the hiddenEntities property to an array of
table objects that you wish to hide. These objects must be the same references
as those in the tables property.

```js
const users = { ... }
const orders = { ... }
const tables = [users, orders]
const hiddenEntities = [orders]

tableList.tables = tables
tableList.hiddenEntities = hiddenEntities
tableList.addEventListener('bks-entity-unhide', (event) => {
  const entity = event.detail.entity
  const entities = hiddenEntities.filter((hiddenEntity) => hiddenEntity !== entity)
  tableList.hiddenEntities = entities
})
```

## Pinning

To pin an entity, set the `pinnedEntities` property to an array of objects.
These object should have the same reference as the ones in the `tables` property.

```js
const users = { ... }
const orders = { ... }
const tables = [users, orders]
const pinnedEntities = [orders]

tableList.tables = tables
tableList.pinnedEntities = orders
tableList.addEventListener('bks-entity-pin', (event) => {
  const entity = event.detail.entity
  const entities = pinnedEntities.concat(entity)
  tableList.pinnedEntities = entities
})
tableList.addEventListener('bks-entity-unpin', (event) => {
  const entity = event.detail.entity
  const entities = pinnedEntities.filter((pinnedEntity) => pinnedEntity !== entity)
  tableList.pinnedEntities = entities
})
```

## Lazy Loading Columns

If a table entity doesn\'t have a `columns` property, or its value is `undefined`,
the component will emit the `bks-entities-request-columns` event when the entity
is expanded. An entity can be expanded by clicking the expand icon next to the
entity icon, or by clicking the expand all icon in the top right corner.

```js
tableList.addEventListener('bks-entities-request-columns', (event) => {
  const entities = event.detail.entities
  // Load the columns here ...
})
```

Table List also supports virtual rendering, so if you have a large number of
entities and all entities are expanded at once, it will only request the columns
for the reasonable number of entities.

This will work for other table-like entities like views and materialized views.

If you wish to stop the event from being emitted, you can add the `columns`
property to the entity and set it to `[]` (an empty array).

## Context Menu
