# SQL Text Editor API

This component inherits all features from the [Text Editor API](./text-editor.md), including Language Server Protocol support. Below are the SQL-specific properties and events in addition to those inherited.

## Properties

In addition to the properties inherited from the Text Editor, the SQL Text Editor provides:

| Name                | Type                                                      | Description                                                                                                                                                                                                                                                                  | Default     |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `entities`          | `object[]`                                                | An array of entity names to autocomplete. The format is the same as the `entities` property of the `bks-entity-list` component.                                                                                                                                              | `[]`        |
| `columnsGetter`     | `(entityName: string) => (string[] \| Promise<string[]>)` | If provided, this function will be called for autocompleting column names instead of using the `entities.columns` property. Expect one argument of type `string` representing a combination of schema name (if exists) and entity name. Accepts async or non-async function. | `undefined` |
| `defaultSchema`     | `string`                                                  | The default schema to use when autocompleting entity names. Schemas that match this will be prioritized in the autocompletion list.                                                                                                                                          | `public`    |
| `formatterDialect`  | `string`                                                  | The SQL dialect to use for formatting. See sql-formatter's [language](https://github.com/sql-formatter-org/sql-formatter/blob/master/docs/language.md) for possible options.                                                                                                 | `'sql'`     |
| `identifierDialect` | `string`                                                  | The SQL dialect to use for identifier quotes. See sql-query-identifier [API](https://github.com/coresql/sql-query-identifier?tab=readme-ov-file#api) for possible options.                                                                                                   | `'generic'` |
| `formatterConfig`   | `object`                                                  | Configuration object for the SQL formatter. See sql-formatter's [options](https://github.com/sql-formatter-org/sql-formatter/blob/master/docs/options.md) for possible values. Should include an `id` property to track the selected formatter preset.                       | `{}`        |
| `allowPresets`      | `boolean`                                                 | When enabled, adds a submenu to the "Format Query" context menu item showing available formatter presets.                                                                                                                                                                    | `false`     |
| `presets`           | `object[]`                                                | An array of formatter preset objects. Each preset should have `id`, `name`, and `config` properties. Used when `allowPresets` is `true` to populate the formatter preset submenu in the context menu.                                                                        | `[]`        |

## Events

In addition to the events inherited from the Text Editor, the SQL Text Editor provides:

| Name                         | Description                                                                                           | Event Detail                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `bks-query-selection-change` | Emitted when the query selection is changed.                                                          | `{ selectedQuery: IdentifyResult, queries: IdentifyResult[] }` |
| `bks-apply-preset`           | Emitted when a formatter preset is selected from the context menu. Used to apply the selected preset. | `{ id: number, ...config }`                                    |
