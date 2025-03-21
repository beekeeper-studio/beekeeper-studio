# Context Menu

Context Menu are not exposed as a component, but it's used by other components.

## Extending the Context Menu

The default context menu can be extended by providing an array of
[Menu Item][menu-item] or a function.

### Using an array

The default menu can be replaced with an array:

```js
table.cellContextMenuItems = [
  {
    label: "Copy",
    handler: (event, cell, menuItem) => {},
  },
  {
    label: "Cut",
    handler: (event, cell, menuItem) => {},
  },
  {
    label: "Delete",
    handler: (event, cell, menuItem) => {},
  },
];
```

### Using a function

Or you can customize the default menu by searching for specific items using
their `id`s, then adding or removing them as needed.

```js
// Adding a new item relative to an existing item
table.cellContextMenuItems = (event, cell, items) => {
  const index = items.findLastIndex((item) => item.id.includes("range-copy"));
  return items.toSpliced(index + 1, 0, {
    name: "Custom Action",
    handler: () => console.log("Custom action executed!", cell),
  });
};

// Removing default items
table.cellContextMenuItems = (event, cell, items) => {
  return items.filter((item) => item.id.includes("range-copy"));
};
```

## Creating a menu item

There are two required properties to make a simple [Menu Item][menu-item]:

```js
const menuItem = {
  label: "Delete",
  handler(event, target, menuItem) {},
};
```

### Checkbox

```js
const checkboxMenuItem = {
  label: "Show tables",
  handler(event, target, menuItem) {},
  checked: true,
};
```

### Divider

A divider is a special item that adds a horizontal line between menu items.

```js
const dividerMenuItem = {
  type: "divider",
};
```

## API

See the API reference below for more details.

- [Menu Item][menu-item]

[menu-item]: ./api/menu-item.md
