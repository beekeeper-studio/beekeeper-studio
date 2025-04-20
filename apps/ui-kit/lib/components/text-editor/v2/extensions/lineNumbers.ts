import { Compartment } from "@codemirror/state";
import {
  EditorView,
  lineNumbers as originalLineNumbers,
} from "@codemirror/view";

const lineNumbersCompartment = new Compartment();

export function lineNumbers() {
  return lineNumbersCompartment.of(originalLineNumbers());
}

/**
 * Toggle line numbers
 */
export function applyLineNumbers(view: EditorView, enabled: boolean) {
  view.dispatch({
    effects: lineNumbersCompartment.reconfigure(
      enabled ? originalLineNumbers() : []
    ),
  });
}
