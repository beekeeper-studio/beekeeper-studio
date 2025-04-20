import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const lineWrappingCompartment = new Compartment();

export function lineWrapping() {
  return lineWrappingCompartment.of([]);
}

/**
 * Toggle line wrapping
 */
export function applyLineWrapping(view: EditorView, enabled: boolean) {
  view.dispatch({
    effects: lineWrappingCompartment.reconfigure(
      enabled ? EditorView.lineWrapping : []
    ),
  });
}

