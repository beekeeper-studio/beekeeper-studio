# Menu Item API

For examples and usage details, visit [Context Menu][context-menu] page.

## Overview

The `MenuItem` type defines the structure of items in a menu, including labels,
handlers, shortcuts, and additional properties such as checkboxes and dividers.

## Menu Item Types

### Standard Menu Item

| Property   | Type                           | Required | Description                                                                                   |
| ---------- | ------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `label`    | `string` \| `{ html: string }` | **Yes**  | Menu item label, can be plain text or HTML. Please only use raw html if you trust the source. |
| `handler`  | `function`                     | **Yes**  | Function executed when item is clicked                                                        |
| `id`       | `string`                       | No       | Unique identifier                                                                             |
| `class`    | `string`                       | No       | CSS class for styling                                                                         |
| `shortcut` | `string` \| `string[]`         | No       | Keyboard shortcut                                                                             |
| `disabled` | `boolean`                      | No       | Whether the item is disabled                                                                  |
| `items`    | `MenuItem[]`                   | No       | Submenu items                                                                                 |
| `keepOpen` | `boolean`                      | No       | Keeps menu open after clicking                                                                |

### Checkbox Menu Item

| Property   | Type                            | Required | Description                            |
| ---------- | ------------------------------- | -------- | -------------------------------------- |
| `label`    | `string` \| `{ html: string }`  | **Yes**  | Menu item label                        |
| `handler`  | `function`                      | **Yes**  | Function executed when item is clicked |
| `checked`  | `boolean`                       | **Yes**  | Checkbox state                         |
| `id`       | `string`                        | No       | Unique identifier                      |
| `class`    | `string`                        | No       | CSS class for styling                  |
| `shortcut` | `string` \| `string[]`          | No       | Keyboard shortcut                      |
| `disabled` | `boolean`                       | No       | Whether the item is disabled           |
| `items`    | `MenuItem[]` \| `DividerItem[]` | No       | Submenu items                          |
| `keepOpen` | `boolean`                       | No       | Keeps menu open after clicking         |

### Divider

| Property | Type        | Required | Description                |
| -------- | ----------- | -------- | -------------------------- |
| `type`   | `'divider'` | **Yes**  | Creates a visual separator |

[context-menu]: ../context-menu.md
