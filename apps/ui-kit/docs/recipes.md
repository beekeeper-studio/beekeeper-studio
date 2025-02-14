# Recipes

## Customizing context menu items

The context menu consists of a list of menu items, each of which has a `id` property. You can customize the menu by searching for specific items using their `id`s, then adding or removing them as needed.

### Removing menu items

```js
contextMenu.contextMenuItems = (event, target, items) => {
  return items.filter((item) => !item.id.includes('-format'));
};
```

### Adding a new item relative to an existing item

```js
table.cellContextMenuItems = (event, target, items) => {
  const newItems = [...items]; // avoid mutating the original array
  const lastCopyIndex = newItems.findLastIndex((item) => item.id.includes('range-copy'));
  newItems.splice(lastCopyIndex + 1, 0, {
    name: 'Custom Action',
    handler: () => console.log('Custom action executed!', target),
  });
  return newItems;
};
```

### Divider

A divider is a special item that adds a horizontal line between menu items.

```js
tableList.contextMenuItems = [
  action1,
  action2,
  { type: 'divider' },
  action3,
]
```
