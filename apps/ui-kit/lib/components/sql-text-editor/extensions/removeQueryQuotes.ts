/**
 * CodeMirror extension that automatically removes query quotes when pasting SQL queries.
 * This extension intercepts paste events and processes the pasted text to clean up quoted queries.
 */
import { StateEffect, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Dialect } from "sql-query-identifier";
import { removeQueryQuotes } from "../../../utils";

const setDialect = StateEffect.define<Dialect>();

const dialect = StateField.define<Dialect>({
  create() {
    return "generic";
  },
  update(value, tr) {
    for (let e of tr.effects) if (e.is(setDialect)) value = e.value;
    return value;
  },
});

function applyDialect(view: EditorView, dialectValue: Dialect) {
  view.dispatch({
    effects: setDialect.of(dialectValue)
  });
}

function removeQueryQuotesExtension() {
  return [
    dialect,
    EditorView.clipboardInputFilter.of((text, state) =>
      removeQueryQuotes(text, state.field(dialect))
    ),
  ];
}

export {
  applyDialect,
  removeQueryQuotesExtension,
}
