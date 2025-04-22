import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const readOnlyCompartment = new Compartment();

export interface ReadOnlyConfiguration {
  enabled?: boolean;
}

export function readOnly(config: ReadOnlyConfiguration = { enabled: false }) {
  return readOnlyCompartment.of(EditorState.readOnly.of(config.enabled));
}

/**
 * Set read-only mode
 */
export function applyReadOnly(view: EditorView, readOnly: boolean) {
  view.dispatch({
    effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
  });
}
