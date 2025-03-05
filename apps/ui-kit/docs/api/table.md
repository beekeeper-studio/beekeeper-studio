# Table API

## Properties

| Name                           | Type                     | Description                                                                                                             | Default     |
| ------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| `name`                         | `string`                 | The name of the table.                                                                                                  | `table`     |
| `data`                         | `object[]`               | An array of objects representing the table data where the keys are the column fields.                                   | `[]`        |
| `columns`                      | `object[]`               | An array of objects representing the table columns. See [Column Definition](#column-definition) below for more details. | `[]`        |
| `cellContextMenuItems`         | `object[]` \| `function` | Extend the cell context menu. See [Context Menu][context-menu] for more details.                                        | `undefined` |
| `rowContextMenuItems`          | `object[]` \| `function` | Extend the row context menu. See [Context Menu][context-menu] for more details.                                         | `undefined` |
| `columnHeaderContextMenuItems` | `object[]` \| `function` | Extend the column header context menu. See [Context Menu][context-menu] for more details.                               | `undefined` |
| `rowHeaderContextMenuItems`    | `object[]` \| `function` | Extend the row header context menu. See [Context Menu][context-menu] for more details.                                  | `undefined` |
| `cornerHeaderContextMenuItems` | `object[]` \| `function` | Extend the corner header context menu. See [Context Menu][context-menu] for more details.                               | `undefined` |
| `tabulatorOptions`             | `object`                 | Extend the tabulator definition. See [Tabulator docs](https://tabulator.info/docs/6.3/options) for more details.        | `undefined` |

### Column Definition

| Name                        | Type                   | Description                                                                                                                                                                          | Default     |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `field`<sup>required</sup>  | `string`               | The key of the column in the data array.                                                                                                                                             |             |
| `title`                     | `string`               | The title of the column displayed in the table header. If not provided, the `field` will be used.                                                                                    | `undefined` |
| `editable`                  | `boolean`              | Make the column editable.                                                                                                                                                            | `false`     |
| `dataType`                  | `string`               | The data type of the column.                                                                                                                                                         | `undefined` |
| `cssClass`                  | `string`               | The CSS class to apply to the column.                                                                                                                                                | `undefined` |
| `sorter`                    | `string` \| `'none'`   | The sorter to use for the column. Use `none` to disable sorting. Also see the [built-in sorters](https://tabulator.info/docs/6.3/sort#func-builtin) from tabulator for more options. | `undefined` |
| `primaryKey`                | `boolean`              | Make the column a primary key. If `true`, the column header will indicate that it is a primary key.                                                                                  | `undefined` |
| `foreignKey`                | `boolean`              | Similar to `primaryKey`.                                                                                                                                                             | `undefined` |
| `generated`                 | `boolean`              | Similar to `primaryKey`.                                                                                                                                                             | `undefined` |
| `tabulatorColumnDefinition` | `object` \| `function` | Extend the tabulator column definition. See [Tabulator docs](https://tabulator.info/docs/6.3/columns#definition) for more details.                                                   | `undefined` |

## Methods

| Name             | Description                                                                                                        | Arguments |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| `getTabulator()` | Returns the Tabulator instance. See [Tabulator docs](https://tabulator.info/docs/6.3/update) for more information. | -         |

## Events

| Name                    | Description                                           | Event Detail                                                    |
| ----------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| `bks-initialized`       | Emitted when the Table is initialized.                | `{ tabulator: Tabulator }`                                      |
| `bks-sorters-change`    | Emitted when the sorters are changed.                 | `{ sorters: { field: string, dir: 'asc' \| 'desc' }[] }`        |
| `bks-ranges-change`     | Emitted when the ranges are changed.                  | `{ ranges: TabulatorRange[] }`                                  |
| `bks-foreign-key-go-to` | Emitted when the foreign key go to button is clicked. | `{ value: any; field: string; cell: Tabulator.CellComponent; }` |

[context-menu]: ../context-menu.md
