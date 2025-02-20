# Overview

The `@bks/ui-kit` library provides a set of custom elements that can be used
to create interactive user interfaces for database applications. Currently, the
library includes the following components:

- [**Table**](./table.md): A custom element for displaying tabular data.
- [**Entity List**](./entity-list.md): A custom element for displaying a list of entities in a tree structure.
- [**SQL Text Editor**](./sql-text-editor.md): A custom element for editing SQL queries with syntax highlighting and auto-completion.
- [**Data Editor**](./data-editor.md): A custom element that provides all of the above in one place.

## Installation

To load the `@bks/ui-kit` library in your project, follow these steps:

1. Install the library using npm or yarn:

   ```bash
   npm install @bks/ui-kit
   ```

2. Import the style and the components:

   ```js
   import "@bks/ui-kit/style.css";

   // Import components individually
   import "@bks/ui-kit/bks-table.js";

   // Or import all components
   import "@bks/ui-kit";
   ```

3. Use the component in your HTML:

   ```html
   <bks-table></bks-table>
   ```

## Reactivity

TODO

## Note

When the custom element is removed from the document, the Vue component behaves just as if it's inside a <keep-alive> and its deactivated hook will be called. When it's inserted again, the activated hook will be called.

If you wish to destroy the inner component, you'd have to do that explicitly:

```js
document.querySelector("bks-entity").vueComponent.$destroy();
```
