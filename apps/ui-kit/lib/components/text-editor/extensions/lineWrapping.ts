import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export interface LineWrappingConfiguration {
  enabled: boolean;
}

const lineWrappingCompartment = new Compartment();

export function lineWrapping(config: LineWrappingConfiguration = { enabled: false }) {
  return lineWrappingCompartment.of(config.enabled ? EditorView.lineWrapping : []);
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

