# Menu Item API

For examples and usage details, visit [Context Menu][context-menu] page.

## Overview

The `MenuItem` type defines the structure of items in a menu, including labels,
handlers, shortcuts, and additional properties such as checkboxes and dividers.

## Menu Item Types

### Standard Menu Item

| Property                     | Type                           | Description                                                                                   | Default     |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- | ----------- |
| `label`<sup>required</sup>   | `string` \| `{ html: string }` | Menu item label, can be plain text or HTML. Please only use raw html if you trust the source. |             |
| `handler`<sup>required</sup> | `function`                     | Function executed when item is clicked                                                        |             |
| `id`                         | `string`                       | Unique identifier                                                                             | `undefined` |
| `class`                      | `string`                       | CSS class for styling                                                                         | `undefined` |
| `shortcut`                   | `string` \| `string[]`         | Keyboard shortcut                                                                             | `undefined` |
| `disabled`                   | `boolean`                      | Whether the item is disabled                                                                  | `false`     |
| `items`                      | `MenuItem[]`                   | Submenu items                                                                                 | `undefined` |
| `keepOpen`                   | `boolean`                      | Keeps menu open after clicking                                                                | `false`     |

### Checkbox Menu Item

When `checked` is defined, the item becomes a checkbox item.

| Property                     | Type                            | Description                            | Default     |
| ---------------------------- | ------------------------------- | -------------------------------------- | ----------- |
| `label`<sup>required</sup>   | `string` \| `{ html: string }`  | Menu item label                        |             |
| `handler`<sup>required</sup> | `function`                      | Function executed when item is clicked |             |
| `checked`<sup>required</sup> | `boolean`                       | Checkbox state                         |             |
| `id`                         | `string`                        | Unique identifier                      | `undefined` |
| `class`                      | `string`                        | CSS class for styling                  | `undefined` |
| `shortcut`                   | `string` \| `string[]`          | Keyboard shortcut                      | `undefined` |
| `disabled`                   | `boolean`                       | Whether the item is disabled           | `false`     |
| `items`                      | `MenuItem[]` \| `DividerItem[]` | Submenu items                          | `undefined` |
| `keepOpen`                   | `boolean`                       | Keeps menu open after clicking         | `false`     |

### Divider

| Property                  | Type        | Description                | Default |
| ------------------------- | ----------- | -------------------------- | ------- |
| `type`<sup>required</sup> | `'divider'` | Creates a visual separator |         |

[context-menu]: ../context-menu.md
