# Getting Started

`@beekeeperstudio/ui-kit` library provides a set of custom elements or components that can
be used to create interactive user interfaces for database applications.
Currently, it includes the following components:

- [**Table**](./table.md): Displaying tabular data.
- [**Entity List**](./entity-list.md): Displaying a list of entities in a tree structure.
- [**Text Editor**](./text-editor.md): LSP powered text editor with syntax highlighting, auto-completion and more.
- [**SQL Text Editor**](./sql-text-editor.md): Extended version of the Text Editor for editing SQL queries.
- [**Data Editor**](./data-editor.md): Providing all of the above in one place.

For information on customizing the appearance of these components, see the [Customizing UI Kit Components](./customizing.md) documentation. Specific CSS properties for styling the SQL Text Editor and Table components can be found in their respective documentation pages.

## Installation

To load the `@beekeeperstudio/ui-kit` library in your project, follow these steps:

1. Install the library using npm or yarn:

   ```bash
   npm install @beekeeperstudio/ui-kit
   ```

2. Import the style and the components:

   ```js
   import "@beekeeperstudio/ui-kit/style.css";

   // Import components individually
   import "@beekeeperstudio/ui-kit/bks-table.js";

   // Or import all components
   import "@beekeeperstudio/ui-kit";
   ```

3. Use the component in your HTML:

   ```html
   <bks-table></bks-table>
   <script>
     const table = document.querySelector("bks-table");
     table.columns = [{ field: "id" }, { field: "name" }];
     table.data = [
       { id: 1, name: "John" },
       { id: 2, name: "Jane" },
     ];
   </script>
   ```

## Attributes and Properties

Attributes are set in HTML and available in JavaScript using dedicated APIs:

```html
<bks-sql-text-editor read-only="true"></bks-sql-text-editor>
```

```js
sqlTextEditor.setAttribute("read-only", "true");
```

While attributes are always `string`, `@beekeeperstudio/ui-kit` converts them to the
correct types based on the corresponding properties types. These types are
`boolean` and `number`.

For other types, you will need to use properties.

Properties are set in JavaScript and they support all types. Most of the times,
you need to use properties instead of attributes. Assigning complex types to
attributes in HTML will not work:

```html
<bks-table
  columns="[{ field: 'id' }, { field: 'name' }]"
  data="[{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]"
>
</bks-table>
```

Instead, you need to set the properties in JavaScript:

```js
const table = document.querySelector("bks-table");
table.columns = [{ field: "id" }, { field: "name" }];
table.data = [
  { id: 1, name: "John" },
  { id: 2, name: "Jane" },
];
```

Be aware that attributes are in `kebab-case` while the properties are in `camelCase`.

To learn more about the properties and their types, please refer to the API documentation.

## Reactivity

`@beekeeperstudio/ui-kit` uses [Vue](https://v2.vuejs.org/) as its main framework. Therefore,
the custom element will be reactive to changes in html properties and attributes.

```html
<bks-sql-text-editor value="SELECT * FROM users"></bks-sql-text-editor>
<script>
  const editor = document.querySelector("bks-sql-text-editor");
  editor.value = "SELECT * FROM users WHERE id = 1"; // Will trigger an update
</script>
```

For non-primitive values, such as objects and arrays, Vue assigns getters and
setters to track the changes. For example, both of the following snippets are
equivalent and will both trigger updates:

```js
table.data = [
  { id: 1, name: "John" },
  { id: 2, name: "Jane" },
];
table.data.push({ id: 3, name: "Bob" });
```

vs.

```js
const data = [
  { id: 1, name: "John" },
  { id: 2, name: "Jane" },
];
table.data = data;
data.push({ id: 3, name: "Bob" });
```

If you wish to avoid your objects and arrays to be assigned with the reactive
properties, you can clone them before passing them to the custom element or
use `Object.freeze()` which ultimately makes the object immutable.

```js
const data = [
  { id: 1, name: "John" },
  { id: 2, name: "Jane" },
];
Object.freeze(data);
table.data = data;
```

## Events

`@beekeeperstudio/ui-kit` components emit events in the same way as native HTML elements.
To listen to events, use the `addEventListener()` method. The data of the event
is available in the `event.detail` property. For example:

```js
sqlTextEditor.addEventListener("bks-value-change", (event) => {
  const value = event.detail.value
  console.log(value);
})
```

For a list of all available events, please refer to the API documentation.

## Lifecycle

When the custom element is removed from the document, the Vue component behaves just as if it's inside a <keep-alive> and its deactivated hook will be called. When it's inserted again, the activated hook will be called.

If you wish to destroy the inner component, you'd have to do that explicitly:

```js
document.querySelector("bks-entity").vueComponent.$destroy();
```
