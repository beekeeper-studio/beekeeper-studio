import { SQLConfig as CMSQLConfig } from "@codemirror/lang-sql";
import { Facet, StateEffect, StateField } from "@codemirror/state";
import { Entity } from "@/components/types";
import { EditorView } from "@codemirror/view";
import { buildSchema, columnsToCompletions } from "../utils";
import { schemaCompletionFilter } from "./vendor/@codemirror/lang-sql/src/complete";
import { sql } from "./vendor/@codemirror/lang-sql/src/sql";

type SQLConfig = CMSQLConfig & {
  disableSchemaCompletion?: boolean;
  disableKeywordCompletion?: boolean;
};

type ColumnsGetter = (entity: Entity) => string[] | Promise<string[]>;

const setEntities = StateEffect.define<Entity[]>();
const setSchema = StateEffect.define<ReturnType<typeof buildSchema>>();
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
const schema = StateField.define<ReturnType<typeof buildSchema>>({
  create() {
    return {};
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setSchema)) return e.value;
    }
    return value;
  },
});
const configFacet = Facet.define<SQLConfig, SQLConfig>({
  combine: (values) => values[0],
});
export const columnsGetter = StateField.define<ColumnsGetter | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setColumnsGetter)) return e.value;
    }
    return value;
  },
});
const setColumnsGetter = StateEffect.define<ColumnsGetter>();

/**
 * Get all base SQL extensions
 */
function customSql(config: SQLConfig = {}) {
  return [
    // we regiter entities so it can be used by other sql extensions like sqlContextComplete
    entities,
    schema,
    configFacet.of(config),
    columnsGetter,
    sql(config),
    columnsCompletions,
  ];
}

function applyColumnsGetter(view: EditorView, columnsGetter: ColumnsGetter) {
  view.dispatch({ effects: setColumnsGetter.of(columnsGetter) });
}

function applyEntities(
  view: EditorView,
  entities: Entity[] = [],
  defaultSchema?: string
) {
  const schema = buildSchema(entities, defaultSchema);
  view.dispatch({
    effects: [setEntities.of(entities), setSchema.of(schema)],
  });
}

/** We add our custom columns getter here. */
const columnsCompletions = schemaCompletionFilter.of(
  async (context, source, options) => {
    return options;
    const { parents, aliases, defaultSchemaName } = source;
    if (parents.length >= 1) {
      // Get last segment (table or alias)
      const last = parents[parents.length - 1];
      const path = aliases?.[last];
      let table = last;
      let schema: string | undefined;
      // let alias: string | undefined;

      if (path) {
        // Resolve alias
        // alias = last;
        if (path.length === 2) {
          schema = path[0];
          table = path[1];
        } else {
          table = path[0];
        }
      }

      const entity: Entity = context.state.field(entities).find((e) => {
        if (
          e.entityType !== "table" &&
          e.entityType !== "view" &&
          e.entityType !== "materialized-view"
        ) {
          return false;
        }

        // Filter out tables from other schemas
        if (!schema && defaultSchemaName && e.schema !== defaultSchemaName) {
          return false;
        }

        return e.name === table;
      }) ?? { schema, entityType: "table", name: table };

      const columnsGetterFunc = context.state.field(columnsGetter);
      if (columnsGetterFunc) {
        try {
          const columns = await columnsGetterFunc(entity);
          options = options.concat(columnsToCompletions(columns));
        } catch (e) {
          console.error(e);
        }
      }
    }

    return options;
  }
);

export {
  entities,
  schema,
  applyEntities,
  applyColumnsGetter,
  customSql as sql,
  SQLConfig,
  ColumnsGetter,
};
