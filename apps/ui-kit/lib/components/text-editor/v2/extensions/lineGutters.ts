import { StateField, StateEffect, Extension } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { LineGutter } from "../types";

// State effect to update line gutters
export const setLineGuttersEffect = StateEffect.define<LineGutter[]>();

// State field to store current line gutters
const lineGuttersField = StateField.define<LineGutter[]>({
  create: () => [],
  update(lineGutters, transaction) {
    for (let effect of transaction.effects) {
      if (effect.is(setLineGuttersEffect)) {
        return effect.value;
      }
    }
    return lineGutters;
  },
});

// State field to manage line decorations
const lineGuttersDecorationField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    // Map existing decorations through changes
    decorations = decorations.map(transaction.changes);

    for (let effect of transaction.effects) {
      if (effect.is(setLineGuttersEffect)) {
        const lineGutters = effect.value;
        const lineDecorations: any[] = [];

        for (const lineGutter of lineGutters) {
          try {
            if (lineGutter.type === "changed") {
              // Get the line (1-indexed in CodeMirror 6)
              const line = transaction.state.doc.line(lineGutter.line + 1);
              lineDecorations.push(
                Decoration.line({
                  class: "cm-lineGutter-changed",
                }).range(line.from)
              );
            }
          } catch (e) {
            console.warn("Failed to create line gutter decoration:", e);
          }
        }

        // Sort decorations by position
        lineDecorations.sort((a, b) => a.from - b.from);
        return Decoration.set(lineDecorations);
      }
    }

    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});

export function lineGutters(config: { lineGutters?: LineGutter[] } = {}): Extension {
  return [
    lineGuttersField,
    lineGuttersDecorationField,
    // Initialize with provided lineGutters if any
    ...(config.lineGutters && config.lineGutters.length > 0 ? [
      EditorView.updateListener.of((update) => {
        if (update.view.state.field(lineGuttersField).length === 0) {
          update.view.dispatch({
            effects: setLineGuttersEffect.of(config.lineGutters),
          });
        }
      })
    ] : [])
  ];
}

export function applyLineGutters(view: EditorView, lineGutters: LineGutter[]) {
  view.dispatch({
    effects: setLineGuttersEffect.of(lineGutters),
  });
}
