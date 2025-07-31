/**
 * A CodeMirror extension that triggers completion after typing SQL keywords
 * like SELECT, FROM, JOIN, etc.
 *
 * Usage:
 *   import { sql } from "./customSql";
 *   import { sqlContextComplete } from "./sqlContextComplete";
 *
 *   // Register the extensions
 *   const extensions = [
 *    sql(),
 *    sqlContextComplete(),
 *   ]
 */

import { startCompletion } from "@codemirror/autocomplete";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

function sqlContextComplete(): Extension {
  return [
    EditorView.updateListener.of((update) => {
      // Check if typing occurred
      if (update.docChanged) {
        let spaceInserted = false;

        update.changes.iterChanges(
          (_fromA: any, _toA: any, _fromB: any, _toB: any, inserted: any) => {
            if (inserted.length === 1 && inserted.text[0] === " ") {
              spaceInserted = true;
            }
          }
        );

        if (spaceInserted) {
          const cursor = update.state.selection.main.head;
          const line = update.state.doc.lineAt(cursor);
          const textBefore = line.text.slice(0, cursor - line.from);

          // Check if we just typed a space after FROM or JOIN
          if (/\b(SELECT|FROM|JOIN|WHERE|AND|OR)\s$/i.test(textBefore)) {
            // Trigger autocomplete
            startCompletion(update.view);
          }
        }
      }
    }),
  ];
}

export { sqlContextComplete };
