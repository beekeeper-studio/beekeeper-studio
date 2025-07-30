import {
  keywordCompletionSource,
  SQLConfig as CMSQLConfig,
  StandardSQL,
} from "@codemirror/lang-sql";
import { LanguageSupport } from "@codemirror/language";
import { Compartment, Facet, StateEffect, StateField } from "@codemirror/state";
import { Entity } from "@/components/types";
import { EditorView } from "@codemirror/view";
import { buildSchema } from "../utils";
import { CompletionSource } from "@codemirror/autocomplete";
import { completeFromSchema } from "./vendor/@codemirror/lang-sql/src/complete";

type SQLConfig = {
  disableSchemaCompletion?: boolean;
  disableKeywordCompletion?: boolean;
  /** Configuration passed to CodeMirror’s {@link SQLConfig} */
  sqlConfig?: CMSQLConfig;
};


type ColumnsGetter = (entity: Entity) => string[] | Promise<string[]>;

const sqlCompartment = new Compartment();
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
function extendedSql(config: SQLConfig = {}) {
  return [
    // we regiter entities so it can be used by other sql extensions like sqlContextComplete
    entities,
    schema,
    configFacet.of(config),
    columnsGetter,
    // FIXME this is possible without compartment. Just use the statefields
    // inside the completeFromSchema
    sqlCompartment.of(createLangWithCompletion(config)),
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
  const config = {
    ...view.state.facet(configFacet),
    sqlConfig: { ...view.state.facet(configFacet).sqlConfig, schema },
  };

  view.dispatch({
    effects: [
      setEntities.of(entities),
      setSchema.of(schema),
      sqlCompartment.reconfigure(
        createLangWithCompletion(config)
      ),
    ],
  });
}

export function schemaCompletionSource(config: CMSQLConfig): CompletionSource {
  return config.schema
    ? completeFromSchema(
      config.schema,
      config.tables,
      config.schemas,
      config.defaultTable,
      config.defaultSchema,
      config.dialect || StandardSQL
    )
    : () => null;
}

function createLangWithCompletion(config: SQLConfig = {}): LanguageSupport {
  const langExtensions = [];
  const sqlConfig = config.sqlConfig || {};
  const lang = sqlConfig.dialect || StandardSQL;

  if (!config.disableSchemaCompletion) {
    langExtensions.push(
      lang.language.data.of({
        autocomplete: schemaCompletionSource(sqlConfig),
      })
    );
  }

  if (!config.disableKeywordCompletion) {
    langExtensions.push(
      lang.language.data.of({
        autocomplete: keywordCompletionSource(
          lang,
          config.sqlConfig?.upperCaseKeywords,
          config.sqlConfig?.keywordCompletion
        ),
      })
    );
  }

  return new LanguageSupport(lang.language, langExtensions);
}

export { entities, schema, applyEntities, applyColumnsGetter, extendedSql as sql, SQLConfig, ColumnsGetter };
