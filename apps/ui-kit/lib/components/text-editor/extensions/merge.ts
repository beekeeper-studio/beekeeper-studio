import { unifiedMergeView, originalDocChangeEffect } from "@codemirror/merge";
import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export type MergeOptions = {
  enabled: boolean;
  originalText: string;
};

const compartment = new Compartment();

export function merge(options?: MergeOptions) {
  return compartment.of(
    options?.enabled
      ? [
        // Prec.high(EditorState.readOnly.of(true)),
        unifiedMergeView({ original: options.originalText }),
      ]
      : []
  );
}

export function applyMerge(view: EditorView, options?: MergeOptions) {
  view.dispatch({
    effects: compartment.reconfigure(
      options?.enabled
        ? unifiedMergeView({
          original: options.originalText,
        })
        : []
    ),
  });
}
