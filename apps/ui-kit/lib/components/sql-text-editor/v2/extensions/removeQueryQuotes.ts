/**
 * CodeMirror extension that automatically removes query quotes when pasting SQL queries.
 * This extension intercepts paste events and processes the pasted text to clean up quoted queries.
 */
import { EditorView } from "@codemirror/view";
import { Dialect } from "sql-query-identifier";
import { removeQueryQuotes } from "../../../../utils";

export function removeQueryQuotesExtension(dialect: Dialect) {
  return EditorView.domEventHandlers({
    paste(event, view) {
      event.preventDefault();
      const clipboardText = event.clipboardData?.getData("text").trim();
      if (clipboardText) {
        const modifiedText = removeQueryQuotes(clipboardText, dialect);
        view.dispatch({
          changes: {
            from: view.state.selection.main.from,
            to: view.state.selection.main.to,
            insert: modifiedText,
          },
        });
      }
    },
  });
}
