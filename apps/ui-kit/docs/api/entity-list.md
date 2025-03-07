# Entity List API

For examples and usage details, visit [Entity List][entity-list] page.

## Properties

| Name               | Type                     | Description                                                                         | Default     |
| ------------------ | ------------------------ | ----------------------------------------------------------------------------------- | ----------- |
| `entities`         | `object[]`               | An array of entities. See [Entity API][entity] for more details.                    | `[]`        |
| `hiddenEntities`   | `object[]`               | An array of hidden entities. See [Entity API][entity] for more details.             | `[]`        |
| `contextMenuItems` | `object[]` \| `function` | Extend the default context menu. See [Context Menu][context-menu] for more details. | `undefined` |

## Events

| Name                           | Description                                                                   | Event Detail                            |
| ------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------- |
| `bks-entity-expand`            | Emitted when an entity is expanded.                                           | `{ entity: Entity }`                    |
| `bks-entity-collapse`          | Emitted when an entity is collapsed.                                          | `{ entity: Entity }`                    |
| `bks-entity-dblclick`          | Emitted when an entity is double-clicked.                                     | `{ event: MouseEvent, entity: Entity }` |
| `bks-entity-contextmenu`       | Emitted when an entity is right-clicked.                                      | `{ event: MouseEvent, entity: Entity }` |
| `bks-entities-request-columns` | Emitted when expanding an entity and its `columns` is `undefined`.            | `{ entity: Entity }`                    |
| `bks-expand-all`               | Emitted when clicking the expand all button and all entities are expanded.    | -                                       |
| `bks-collapse-all`             | Emitted when clicking the collapse all button and all entities are collapsed. | -                                       |
| `bks-add-entity-click`         | Emitted when the add entity button is clicked.                                | `{ event: MouseEvent }`                 |
| `bks-refresh-click`            | Emitted when the refresh button is clicked.                                   | `{ event: MouseEvent }`                 |

[entity-list]: ../entity-list.md
[entity]: ./entity.md
[context-menu]: ../context-menu.md
