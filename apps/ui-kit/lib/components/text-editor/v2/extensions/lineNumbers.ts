import { Compartment } from "@codemirror/state";
import {
  EditorView,
  lineNumbers as originalLineNumbers,
} from "@codemirror/view";

export interface LineNumbersConfiguration {
  enabled: boolean;
}

const lineNumbersCompartment = new Compartment();

export function lineNumbers(
  config: LineNumbersConfiguration = { enabled: true }
) {
  return lineNumbersCompartment.of(config.enabled ? originalLineNumbers() : []);
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
