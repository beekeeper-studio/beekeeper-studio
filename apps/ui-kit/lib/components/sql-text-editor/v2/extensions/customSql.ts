/**
 * A thin wrapper around the sql() extension that lets you swap in a custom
 * schema at runtime with applyEntities().
 */

import { Extension, Facet, StateEffect, StateField } from "@codemirror/state";
import { sql, SQLConfig } from "@codemirror/lang-sql";
import { CompletionSource } from "@codemirror/autocomplete";
import { buildSchema } from "../utils";
import { EditorView } from "@codemirror/view";
import { Entity } from "../../../types";
import { Compartment } from "@codemirror/state";

const sqlCompartment = new Compartment();
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

const additionalCompletionSourceFacet = Facet.define<
  CompletionSource,
  CompletionSource
>({
  combine: (values) => values[0],
});

function extendedSql(
  config?: SQLConfig,
  additionalCompletionSource?: CompletionSource
): Extension {
  const sqlExtension = sql(config);
  return [
    entities,
    additionalCompletionSourceFacet.of(additionalCompletionSource),
    sqlCompartment.of([
      sqlExtension,
      // Add autocompletion support with our custom source
      sqlExtension.language.data.of({
        autocomplete: additionalCompletionSource,
      }),
    ]),
  ];
}

/**
 * Apply SQL extension with schema information
 */
function applySqlExtension(
  view: EditorView,
  options?: {
    defaultSchema?: string;
    entities?: Entity[];
  }
) {
  const sqlExtension = sql({
    defaultSchema: options?.defaultSchema,
    schema: options?.entities
      ? buildSchema(options.entities, options.defaultSchema)
      : undefined,
  });

  view.dispatch({
    effects: sqlCompartment.reconfigure([
      sqlExtension,
      // Add autocompletion support with our custom source
      sqlExtension.language.data.of({
        autocomplete: view.state.facet(additionalCompletionSourceFacet),
      }),
    ]),
  });
}

function applyEntities(view: EditorView, entities: Entity[]) {
  view.dispatch({
    effects: setEntities.of(entities),
  });
}

export { entities, applySqlExtension, applyEntities, extendedSql as sql };
