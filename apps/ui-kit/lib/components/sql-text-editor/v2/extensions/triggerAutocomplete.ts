/**
 * CodeMirror extension that automatically triggers autocomplete suggestions
 * when typing specific SQL keywords followed by a space (e.g., 'FROM ' or 'JOIN ').
 */
import { startCompletion } from "@codemirror/autocomplete";
import { EditorView } from "@codemirror/view";

export function triggerAutocompleteExtension() {
  return EditorView.updateListener.of((update: any) => {
    // Check if typing occurred
    if (update.docChanged) {
      let spaceInserted = false;

      update.changes.iterChanges(
        (fromA: any, toA: any, fromB: any, toB: any, inserted: any) => {
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
        if (/\b(FROM|JOIN)\s$/i.test(textBefore)) {
          // Trigger autocomplete
          startCompletion(update.view);
        }
      }
    }
  });
}
