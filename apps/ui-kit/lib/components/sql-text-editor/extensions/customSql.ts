/**
 * A thin wrapper around the sql() extension that lets you swap in a custom
 * schema at runtime with applyEntities().
 */

import { SQLConfig as CMSQLConfig } from "@codemirror/lang-sql";
import { Facet, StateEffect, StateField } from "@codemirror/state";
import { Entity } from "../../types";
import { EditorView } from "@codemirror/view";
import { buildSchema } from "../utils";
import { sql } from "./vendor/@codemirror/lang-sql/src/sql";
import { ColumnsGetter } from "./sqlContextComplete";
import { completeConfig, setSchema } from "./vendor/@codemirror/lang-sql/src/complete";

type SQLConfig = CMSQLConfig & {
  disableSchemaCompletion?: boolean;
  disableKeywordCompletion?: boolean;
  columnsGetter?: ColumnsGetter;
};

const setEntities = StateEffect.define<Entity[]>();
const entities = StateField.define<Entity[]>({
  create() {
    return [];
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setEntities)) return e.value;
    }
    return value;
  },
});
export const configFacet = Facet.define<SQLConfig, SQLConfig>({
  combine: (values) => values[0],
});

/**
 * Get all base SQL extensions
 */
function customSql(config: SQLConfig = {}) {
  return [
    // we regiter entities so it can be used by other sql extensions like sqlContextComplete
    entities,
    configFacet.of(config),
    sql(config),
  ];
}

function applyEntities(
  view: EditorView,
  entities: Entity[] = [],
  defaultSchema?: string
) {
  const schema = buildSchema(
    entities,
    defaultSchema,
    view.state.facet(completeConfig).dialect
  );
  view.dispatch({
    effects: [
      setEntities.of(entities),
      setSchema.of(schema),
    ],
  });
}

export { entities, applyEntities, customSql as sql, SQLConfig };
