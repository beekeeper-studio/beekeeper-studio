/**
 * Partial Read-Only Extension for CodeMirror 6
 * 
 * Makes the editor mostly read-only except for specific editable ranges.
 * Useful for JSON editors where only certain values should be editable.
 * 
 * Usage:
 * 1. Create instance: const partial = partialReadonly()
 * 2. Add to extensions: partial.extensions(editableRanges)
 * 3. Listen for changes: partial.addListener("change", (range, value) => {...})
 * 4. Update ranges: partial.setEditableRanges(newRanges)
 */
import {
  EditorState,
  StateEffect,
  StateField,
  Extension,
  Transaction,
} from "@codemirror/state";
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  PluginValue,
} from "@codemirror/view";
import { EditorRange } from "../utils";
import rawLog from "@bksLogger";

const log = rawLog.scope("partialReadOnly");

const PARTIAL_READ_ONLY_CLASSNAME = "bks-partial-read-only";
const EDITABLE_MARKER_CLASSNAME = "bks-editable-marker";
const EDITABLE_MARKER_ACTIVE_CLASSNAME = "bks-editable-marker-active";
const EDITABLE_MARKER_ATTR_ID = "data-bks-editable-id";

// Effects for managing editable ranges
const setEditableRangesEffect = StateEffect.define<EditorRange[]>();
const highlightRangeEffect = StateEffect.define<string>();
const unhighlightRangeEffect = StateEffect.define<string>();
const updateRangeEffect = StateEffect.define<{rangeId: string, newTo: {line: number, ch: number}}>();

interface State {
  ranges: Map<string, EditorRange>;
  highlightedRangeId?: string;
}

function buildRangeMap(ranges: EditorRange[]) {
  const rangeMap = new Map();
  ranges.forEach((range) => {
    if (range.id) {
      rangeMap.set(range.id, range);
    }
  });
  return rangeMap;
}

// State field to track editable ranges
const partialReadonlyState = StateField.define<State>({
  create() {
    return { ranges: new Map() };
  },
  update(state, tr) {
    let newState = { ...state };

    for (const effect of tr.effects) {
      if (effect.is(setEditableRangesEffect)) {
        newState.ranges = buildRangeMap(effect.value);
      } else if (effect.is(highlightRangeEffect)) {
        newState.highlightedRangeId = effect.value;
      } else if (effect.is(unhighlightRangeEffect)) {
        if (newState.highlightedRangeId === effect.value) {
          newState.highlightedRangeId = undefined;
        }
      } else if (effect.is(updateRangeEffect)) {
        const updatedRanges = new Map(newState.ranges);
        const existingRange = updatedRanges.get(effect.value.rangeId);
        if (existingRange) {
          updatedRanges.set(effect.value.rangeId, {
            ...existingRange,
            to: effect.value.newTo
          });
        }
        newState.ranges = updatedRanges;
      }
    }

    return newState;
  },
});

// Decoration for editable ranges
const editableRangeDecoration = (rangeId: string, isHighlighted: boolean) =>
  Decoration.mark({
    class: `${EDITABLE_MARKER_CLASSNAME} ${isHighlighted ? EDITABLE_MARKER_ACTIVE_CLASSNAME : ""
      }`,
    attributes: { [EDITABLE_MARKER_ATTR_ID]: rangeId },
    inclusiveStart: true,
    inclusiveEnd: true,
  });

// StateField for decorations
const editableRangeDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    const state = tr.state.field(partialReadonlyState);
    const decorationArray: Array<{
      from: number;
      to: number;
      decoration: Decoration;
    }> = [];

    for (const [rangeId, range] of state.ranges) {
      try {
        const from =
          tr.state.doc.line(range.from.line + 1).from + range.from.ch;
        const to = tr.state.doc.line(range.to.line + 1).from + range.to.ch;
        const isHighlighted = state.highlightedRangeId === rangeId;

        if (from <= to && from >= 0 && to <= tr.state.doc.length) {
          decorationArray.push({
            from,
            to,
            decoration: editableRangeDecoration(rangeId, isHighlighted),
          });
        }
      } catch (e) {
        // Skip invalid ranges
        log.warn(`Invalid editable range: ${rangeId}`, e);
      }
    }

    // Sort decorations by from position and filter out invalid ranges
    decorationArray.sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      // If same start position, sort by end position
      return a.to - b.to;
    });

    // Remove overlapping or duplicate ranges
    const validDecorations = [];
    let lastEnd = -1;

    for (const item of decorationArray) {
      // Skip ranges that overlap with the previous one
      if (item.from >= lastEnd && item.from < item.to) {
        validDecorations.push(item);
        lastEnd = item.to;
      }
    }

    return Decoration.set(
      validDecorations.map(({ from, to, decoration }) =>
        decoration.range(from, to)
      )
    );
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Helper function to check if a position is within any editable range
function isPositionInEditableRange(
  state: EditorState,
  pos: number
): string | null {
  const partialState = state.field(partialReadonlyState);

  for (const [rangeId, range] of partialState.ranges) {
    try {
      const from = state.doc.line(range.from.line + 1).from + range.from.ch;
      const to = state.doc.line(range.to.line + 1).from + range.to.ch;

      if (pos >= from && pos <= to) {
        return rangeId;
      }
    } catch (e) {
      // Skip invalid ranges
      continue;
    }
  }

  return null;
}

// Transaction filter to prevent edits outside editable ranges
const partialReadOnlyFilter = (editInRangeListener: EditInRangeListener) =>
  EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr;

    // Check if this is a user-initiated edit
    const userEvent = tr.annotation(Transaction.userEvent);
    const isUserEdit = userEvent && (
      userEvent.startsWith("input") ||
      userEvent.startsWith("delete") ||
      userEvent.startsWith("move") ||
      userEvent === "paste"
    );

    // Only apply restrictions to user-initiated edits
    if (!isUserEdit) {
      return tr;
    }

    const state = tr.startState.field(partialReadonlyState);

    // Check each change in the transaction
    let hasInvalidEdit = false;
    const validChanges: any[] = [];

    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const changeStart = fromA;
      const changeEnd = toA;

      // Check if the entire change is within an editable range
      let editableRangeId: string | null = null;
      let isValidEdit = false;

      for (const [rangeId, range] of state.ranges) {
        try {
          const from =
            tr.startState.doc.line(range.from.line + 1).from + range.from.ch;
          const to =
            tr.startState.doc.line(range.to.line + 1).from + range.to.ch;

          // Check if the entire change is within this editable range
          if (changeStart >= from && changeEnd <= to) {
            editableRangeId = rangeId;
            isValidEdit = true;
            break;
          }
        } catch (e) {
          // Skip invalid ranges
          continue;
        }
      }

      if (isValidEdit && editableRangeId) {
        validChanges.push({
          rangeId: editableRangeId,
          from: changeStart,
          to: changeEnd,
          inserted,
        });
      } else {
        hasInvalidEdit = true;
      }
    });

    // If any change is invalid, reject the entire transaction
    if (hasInvalidEdit) {
      return [];
    }

    // Call the listener for valid edits
    if (editInRangeListener && validChanges.length > 0) {
      validChanges.forEach(({ rangeId, from, to, inserted }) => {
        const range = state.ranges.get(rangeId);
        if (range) {
          // Calculate the range boundaries in the original document (before the change)
          try {
            const rangeFrom = tr.startState.doc.line(range.from.line + 1).from + range.from.ch;
            const oldRangeTo = tr.startState.doc.line(range.to.line + 1).from + range.to.ch;

            // Calculate the length change for this specific change
            const lengthDiff = inserted.length - (to - from);
            const newRangeTo = oldRangeTo + lengthDiff;

            // Get the new value from the final document state
            const newValue = tr.state.doc.sliceString(rangeFrom, newRangeTo);
            editInRangeListener(range, newValue);
          } catch (e) {
            // Fallback: try to get the current range value from the final state
            try {
              const rangeFrom = tr.state.doc.line(range.from.line + 1).from + range.from.ch;
              const rangeTo = tr.state.doc.line(range.to.line + 1).from + range.to.ch;
              const newValue = tr.state.doc.sliceString(rangeFrom, rangeTo);
              editInRangeListener(range, newValue);
            } catch (e2) {
              // Final fallback to inserted text
              const newValue = inserted.toString();
              editInRangeListener(range, newValue);
            }
          }
        }
      });
    }

    return tr;
  });

// Helper function to get range ID at mouse position
function getRangeIdAtPosition(view: EditorView, pos: number): string | null {
  const state = view.state.field(partialReadonlyState);

  for (const [rangeId, range] of state.ranges) {
    try {
      const from = view.state.doc.line(range.from.line + 1).from + range.from.ch;
      const to = view.state.doc.line(range.to.line + 1).from + range.to.ch;

      if (pos >= from && pos <= to) {
        return rangeId;
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

// Mouse hover plugin to handle marker hover detection
const hoverPlugin = ViewPlugin.fromClass(class implements PluginValue {
  constructor(private view: EditorView) {
    this.view.dom.addEventListener('mousemove', this.onMouseMove);
    this.view.dom.addEventListener('mouseleave', this.onMouseLeave);
  }

  destroy() {
    this.view.dom.removeEventListener('mousemove', this.onMouseMove);
    this.view.dom.removeEventListener('mouseleave', this.onMouseLeave);
  }

  private onMouseMove = (event: MouseEvent) => {
    const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos !== null) {
      const rangeId = getRangeIdAtPosition(this.view, pos);
      const state = this.view.state.field(partialReadonlyState);

      if (rangeId !== state.highlightedRangeId) {
        const effects = [];
        if (state.highlightedRangeId) {
          effects.push(unhighlightRangeEffect.of(state.highlightedRangeId));
        }
        if (rangeId) {
          effects.push(highlightRangeEffect.of(rangeId));
        }

        if (effects.length > 0) {
          this.view.dispatch({ effects });
        }
      }
    }
  }

  private onMouseLeave = () => {
    const state = this.view.state.field(partialReadonlyState);
    if (state.highlightedRangeId) {
      this.view.dispatch({
        effects: unhighlightRangeEffect.of(state.highlightedRangeId)
      });
    }
  }
});

// Update listener to handle selection changes and range updates
const updateExtension = EditorView.updateListener.of((update) => {
  // Handle selection changes for highlighting (only if not hovering)
  if (update.selectionSet) {
    const state = update.state.field(partialReadonlyState);
    const cursor = update.state.selection.main.head;
    const activeRangeId = isPositionInEditableRange(update.state, cursor);

    // Only update selection-based highlighting if we're not already hovering a range
    if (activeRangeId !== state.highlightedRangeId) {
      const effects = [];
      if (state.highlightedRangeId) {
        effects.push(unhighlightRangeEffect.of(state.highlightedRangeId));
      }
      if (activeRangeId) {
        effects.push(highlightRangeEffect.of(activeRangeId));
      }

      if (effects.length > 0) {
        update.view.dispatch({ effects });
      }
    }
  }

  // Handle range updates when document changes from user edits
  if (update.docChanged) {
    // Check if any user-initiated changes occurred
    const hasUserEdit = update.transactions.some(tr => {
      const event = tr.annotation(Transaction.userEvent);
      return event && (
        event.startsWith("input") ||
        event.startsWith("delete") ||
        event.startsWith("move") ||
        event === "paste"
      );
    });

    if (hasUserEdit) {
      // Get the initial state (before changes) to track what changed
      const initialState = update.startState.field(partialReadonlyState);
      const effects = [];

      // For each range, calculate the total length change and update the end position
      for (const [rangeId, initialRange] of initialState.ranges) {
        let totalLengthChange = 0;
        let rangeWasAffected = false;

        // Calculate total length change within this range across all transactions
        for (const tr of update.transactions) {
          if (!tr.docChanged) continue;

          tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            try {
              // Calculate range positions in the original document
              const rangeFromPos = update.startState.doc.line(initialRange.from.line + 1).from + initialRange.from.ch;
              const rangeToPos = update.startState.doc.line(initialRange.to.line + 1).from + initialRange.to.ch;

              // Check if this change is within the range
              if (fromA >= rangeFromPos && fromA <= rangeToPos) {
                const lengthDiff = inserted.length - (toA - fromA);
                totalLengthChange += lengthDiff;
                rangeWasAffected = true;
              }
            } catch (e) {
              // Skip invalid positions
              return;
            }
          });
        }

        // If the range was affected, update its end position
        if (rangeWasAffected && totalLengthChange !== 0) {
          try {
            // Calculate the new end position
            const originalEndPos = update.startState.doc.line(initialRange.to.line + 1).from + initialRange.to.ch;
            const newEndPos = originalEndPos + totalLengthChange;

            // Convert back to line/ch coordinates using the final document
            const newEndLine = update.state.doc.lineAt(newEndPos);
            const newTo = {
              line: newEndLine.number - 1, // Convert to 0-based
              ch: newEndPos - newEndLine.from
            };


            // Only update if the position actually changed
            if (newTo.line !== initialRange.to.line || newTo.ch !== initialRange.to.ch) {
              effects.push(updateRangeEffect.of({ rangeId, newTo }));
            }
          } catch (e) {
            // Skip ranges with calculation errors
          }
        }
      }

      if (effects.length > 0) {
        update.view.dispatch({ effects });
      }
    }
  }
});

type EditInRangeListener = (range: EditorRange, value: string) => void;

export function partialReadonly() {
  let view: EditorView;
  const changeListener: EditInRangeListener[] = [];

  function extensions(ranges: EditorRange[]): Extension[] {
    return [
      partialReadonlyState.init(() => ({
        ranges: buildRangeMap(ranges),
      })),
      ViewPlugin.fromClass(
        class {
          constructor(editorView: EditorView) {
            view = editorView;
          }
        }
      ),
      EditorView.editorAttributes.of({ class: PARTIAL_READ_ONLY_CLASSNAME }),
      editableRangeDecorations,
      updateExtension,
      hoverPlugin,
      partialReadOnlyFilter((range, value) => {
        changeListener.forEach((listener) => listener(range, value));
      }),
    ];
  }

  function setEditableRanges(ranges: EditorRange[]) {
    if (!view) {
      log.warn("Calling `setEditableRanges` prematurely.");
      return;
    }

    view.dispatch({ effects: setEditableRangesEffect.of(ranges) });
  }

  function addListener(_type: "change", listener: EditInRangeListener) {
    changeListener.push(listener);
  }

  function removeListener(_type: "change", listener: EditInRangeListener) {
    changeListener.splice(changeListener.indexOf(listener), 1);
  }

  return {
    extensions,
    setEditableRanges,
    addListener,
    removeListener,
  };
}
