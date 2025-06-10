import { StateField, StateEffect, Extension, Text } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, WidgetType } from "@codemirror/view";

export interface EditorMarker {
  id?: string;
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  message?: string;
  element?: HTMLElement;
  onClick?: (event: MouseEvent) => void;
  type: "error" | "highlight" | "custom";
}

// Convert line/ch position to absolute position
function posFromLineCol(doc: Text, line: number, ch: number): number {
  if (line < 0 || line >= doc.lines) return 0;
  const lineStart = doc.line(line + 1).from; // Lines are 1-indexed in CodeMirror 6
  const lineEnd = doc.line(line + 1).to;
  return lineStart + Math.min(ch, lineEnd - lineStart);
}

// Widget for custom markers with elements
class MarkerWidget extends WidgetType {
  constructor(
    private element: HTMLElement,
    private onClick?: (event: MouseEvent) => void
  ) {
    super();
  }

  toDOM() {
    if (this.onClick) {
      this.element.addEventListener('click', this.onClick);
    }
    return this.element;
  }

  destroy() {
    if (this.onClick) {
      this.element.removeEventListener('click', this.onClick);
    }
  }

  eq(other: MarkerWidget) {
    return this.element === other.element;
  }
}

// State effect to update markers
export const setMarkersEffect = StateEffect.define<EditorMarker[]>();

// State field to store current markers
const markersField = StateField.define<EditorMarker[]>({
  create: () => [],
  update(markers, transaction) {
    for (let effect of transaction.effects) {
      if (effect.is(setMarkersEffect)) {
        return effect.value;
      }
    }
    return markers;
  },
});

// State field to manage decorations
const markersDecorationField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    // Map existing decorations through changes
    decorations = decorations.map(transaction.changes);

    for (let effect of transaction.effects) {
      if (effect.is(setMarkersEffect)) {
        const markers = effect.value;
        const newDecorations: any[] = [];

        for (const marker of markers) {
          try {
            const from = posFromLineCol(transaction.state.doc, marker.from.line, marker.from.ch);
            const to = posFromLineCol(transaction.state.doc, marker.to.line, marker.to.ch);

            if (marker.type === "error") {
              newDecorations.push(
                Decoration.mark({
                  class: "cm-error",
                  attributes: marker.message ? { title: marker.message } : undefined,
                }).range(from, to)
              );
            } else if (marker.type === "highlight") {
              newDecorations.push(
                Decoration.mark({
                  class: "cm-highlight",
                }).range(from, to)
              );
            } else if (marker.type === "custom" && marker.element) {
              newDecorations.push(
                Decoration.replace({
                  widget: new MarkerWidget(marker.element, marker.onClick),
                }).range(from, to)
              );
            }
          } catch (e) {
            console.warn("Failed to create marker decoration:", e);
          }
        }

        return Decoration.set(newDecorations);
      }
    }

    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});

export function markers(config: { markers?: EditorMarker[] } = {}): Extension {
  return [
    markersField,
    markersDecorationField,
    // Initialize with provided markers if any
    ...(config.markers && config.markers.length > 0 ? [
      EditorView.updateListener.of((update) => {
        if (update.view.state.field(markersField).length === 0) {
          update.view.dispatch({
            effects: setMarkersEffect.of(config.markers),
          });
        }
      })
    ] : [])
  ];
}

export function applyMarkers(view: EditorView, markers: EditorMarker[]) {
  console.log("applyMarkers called with", markers.length, "markers");
  view.dispatch({
    effects: setMarkersEffect.of(markers),
  });
}
