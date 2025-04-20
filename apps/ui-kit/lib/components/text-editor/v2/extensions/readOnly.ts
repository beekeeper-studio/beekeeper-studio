import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const readOnlyCompartment = new Compartment();

export function readOnly() {
  return readOnlyCompartment.of(EditorState.readOnly.of(true));
}

/**
 * Set read-only mode
 */
export function applyReadOnly(view: EditorView, readOnly: boolean) {
  view.dispatch({
    effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
  });
}

