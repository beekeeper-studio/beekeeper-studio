/**
 * CodeMirror extension that automatically removes query quotes when pasting SQL queries.
 * This extension intercepts paste events and processes the pasted text to clean up quoted queries.
 */
import { StateEffect, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Dialect } from "sql-query-identifier";
import { removeQueryQuotes } from "../../../../utils";

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
    EditorView.domEventHandlers({
      paste(event, view) {
        event.preventDefault();
        const clipboardText = event.clipboardData?.getData("text").trim();
        if (clipboardText) {
          const modifiedText = removeQueryQuotes(
            clipboardText,
            view.state.field(dialect)
          );
          view.dispatch({
            changes: {
              from: view.state.selection.main.from,
              to: view.state.selection.main.to,
              insert: modifiedText,
            },
          });
        }
      },
    })
  ];
}

export {
  applyDialect,
  removeQueryQuotesExtension,
}
