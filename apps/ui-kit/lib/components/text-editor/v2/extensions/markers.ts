import { EditorMarker } from "../../v1";
import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
} from "@codemirror/view";
import {
  StateField,
  StateEffect,
  EditorState,
  Extension,
} from "@codemirror/state";

let markerIdCounter = 0;

function generateId(): string {
  return `marker-${markerIdCounter++}`;
}

/** Converts a CodeMirror 5 position to a CodeMirror 6 position */
function pos(state: EditorState, pos: { line: number; ch: number }): number {
  const lineInfo = state.doc.line(pos.line + 1); // CM6 line numbers start at 1
  return lineInfo.from + pos.ch;
}

// Custom widget for "custom" type marker
class CustomWidget extends WidgetType {
  constructor(
    private element: HTMLElement,
    private onClick?: (event: MouseEvent) => void
  ) {
    super();
  }

  toDOM(): HTMLElement {
    if (this.onClick) {
      this.element.addEventListener("click", this.onClick);
    }
    return this.element;
  }

  // Allow click events to be handled
  ignoreEvent(): boolean {
    return false;
  }

  destroy(dom: HTMLElement): void {
    if (this.onClick) {
      dom.removeEventListener("click", this.onClick);
    }
  }
}

const addMarker = StateEffect.define<{
  id: string;
  className: string;
  attributes?: { [key: string]: string };
  from: number;
  to: number;
}>();

// State effect for custom widget
const addWidget = StateEffect.define<{
  id: string;
  from: number;
  to: number;
  element: HTMLElement;
  onClick?: (event: MouseEvent) => void;
}>();

// Define a state effect to clear all markers
const clearAllMarkers = StateEffect.define<null>();

// State field for underline decorations
const markerField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(markers, tr) {
    markers = markers.map(tr.changes);

    for (let e of tr.effects) {
      // Handle clearing all markers
      if (e.is(clearAllMarkers)) {
        return Decoration.none;
      }

      if (e.is(addMarker)) {
        const deco = Decoration.mark({
          class: e.value.className,
          attributes: e.value.attributes,
          id: e.value.id,
        }).range(e.value.from, e.value.to);
        markers = markers.update({ add: [deco] });
      }
    }
    return markers;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// State field for widget decorations
const widgetField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(widgets, tr) {
    widgets = widgets.map(tr.changes);

    for (let e of tr.effects) {
      // Handle clearing all markers
      if (e.is(clearAllMarkers)) {
        return Decoration.none;
      }

      if (e.is(addWidget)) {
        const widget = Decoration.replace({
          widget: new CustomWidget(e.value.element, e.value.onClick),
          inclusive: true,
          id: e.value.id,
        }).range(e.value.from, e.value.to);
        widgets = widgets.update({ add: [widget] });
      }
    }
    return widgets;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function markers(): Extension {
  return [markerField, widgetField];
}

export function applyMarkers(view: EditorView, markers: EditorMarker[]) {
  // Create effects array with clearAllMarkers as the first effect
  const effects: StateEffect<unknown>[] = [clearAllMarkers.of(null)];

  // Then add all the new markers
  for (const marker of markers) {
    if (marker.type === "error") {
      effects.push(
        addMarker.of({
          id: generateId(),
          from: pos(view.state, marker.from),
          to: pos(view.state, marker.to),
          className: "bks-marker-error",
          attributes: {
            title: marker.message,
          },
        })
      );
    } else if (marker.type === "highlight") {
      effects.push(
        addMarker.of({
          id: generateId(),
          from: pos(view.state, marker.from),
          to: pos(view.state, marker.to),
          className: "highlight",
        })
      );
    } else if (marker.type === "custom" && marker.element) {
      effects.push(
        addWidget.of({
          id: generateId(),
          from: pos(view.state, marker.from),
          to: pos(view.state, marker.to),
          element: marker.element,
          onClick: marker.onClick,
        })
      );
    }
  }

  // Dispatch a single transaction with all effects
  view.dispatch({ effects });
}
