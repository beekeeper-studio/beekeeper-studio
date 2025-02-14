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

To hide an entity, set the `hiddenEntities` property to an array of objects. These object should have the same reference as the ones in the `tables` property.

```js
const users = { ... }
const orders = { ... }

tableList.tables = [users, orders]
tableList.hiddenEntities = [orders]
tableList.addEventListener('bks-entity-unhide', (event) => {
  const entity = event.detail.entity
  const entities = tableList.hiddenEntities.filter((hiddenEntity) => hiddenEntity !== entity)
  tableList.hiddenEntities = entities
})
```

## Pinning

To pin an entity, set the `pinnedEntities` property to an array of objects. These object should have the same reference as the ones in the `tables` property.

## Lazy Loading Columns

## Context Menu
