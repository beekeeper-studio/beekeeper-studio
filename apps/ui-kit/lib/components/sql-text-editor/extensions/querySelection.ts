import _ from "lodash";
import { Extension, StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { identify, Options } from "sql-query-identifier";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
// Utility function from entity-list/sql_tools
function isTextSelected(
  textStart: number,
  textEnd: number,
  selectionStart: number,
  selectionEnd: number
) {
  const cursorMin = Math.min(selectionStart, selectionEnd);
  const cursorMax = Math.max(selectionStart, selectionEnd);
  const queryMin = Math.min(textStart, textEnd);
  const queryMax = Math.max(textStart, textEnd);
  if (
    (cursorMin >= queryMin && cursorMin <= queryMax) ||
    (cursorMax > queryMin && cursorMax <= queryMax) ||
    (cursorMin <= queryMin && cursorMax >= queryMax)
  ) {
    return true;
  }
  return false;
}

export interface QuerySelectionChangeParams {
  queries: IdentifyResult[];
  selectedQuery: IdentifyResult;
}

interface QuerySelectionState {
  queries: IdentifyResult[];
  selectedQueryIndex: number;
  selectedQueryPosition: { from: number; to: number } | null;
  decorations: DecorationSet;
}

// Effects for updating the state
const setDialectEffect = StateEffect.define<Options["dialect"]>();
const setCallbackEffect = StateEffect.define<(params: QuerySelectionChangeParams) => void>();

// State for storing dialect and callback
const dialectState = StateField.define<Options["dialect"]>({
  create: () => "generic",
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setDialectEffect)) {
        return effect.value;
      }
    }
    return value;
  }
});

const callbackState = StateField.define<((params: QuerySelectionChangeParams) => void) | null>({
  create: () => null,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setCallbackEffect)) {
        return effect.value;
      }
    }
    return value;
  }
});

function getSelectedQueryPosition(
  queries: IdentifyResult[],
  selectedQueryIndex: number
) {
  const selectedQuery = queries[selectedQueryIndex];
  if (!selectedQuery || !queries) {
    return null;
  }
  const qi = selectedQueryIndex;
  const previousQuery = qi === 0 ? null : queries[qi - 1];
  // adding 1 to account for semicolon
  const start = previousQuery ? previousQuery.end + 1 : 0;
  const end = selectedQuery.end;

  return {
    from: start,
    to: end + 1,
  };
}

function getSelectedQueryIndex(
  queries: IdentifyResult[],
  cursorIndex: number,
  cursorIndexAnchor: number
) {
  for (let i = 0; i < queries.length; i++) {
    // Find a query in between anchor and head cursors
    if (cursorIndex !== cursorIndexAnchor) {
      const isSelected = isTextSelected(
        queries[i].start,
        queries[i].end,
        cursorIndexAnchor,
        cursorIndex
      );
      if (isSelected) return i;
    }
    // Otherwise, find a query that sits before the cursor
    if (cursorIndex <= queries[i].end + 1) return i;
  }
  return -1;
}

function splitQueries(queryText: string, dialect: Options["dialect"]) {
  if (_.isEmpty(queryText.trim())) {
    return [];
  }
  const result = identify(queryText, { strict: false, dialect });
  return result;
}

// State field that manages query selection
const querySelectionState = StateField.define<QuerySelectionState>({
  create: () => ({
    queries: [],
    selectedQueryIndex: -1,
    selectedQueryPosition: null,
    decorations: Decoration.none,
  }),

  update: (state, tr) => {
    const dialect = tr.state.field(dialectState);
    const callback = tr.state.field(callbackState);

    // Get cursor positions
    const cursor = tr.state.selection.main;
    const cursorIndex = cursor.head;
    const cursorIndexAnchor = cursor.anchor;

    // Split queries
    const queries = splitQueries(tr.state.doc.toString(), dialect);
    const selectedQueryIndex = getSelectedQueryIndex(
      queries,
      cursorIndex,
      cursorIndexAnchor
    );
    const selectedQueryPosition = getSelectedQueryPosition(
      queries,
      selectedQueryIndex
    );

    // Check if anything changed
    if (
      _.isEqual(queries, state.queries) &&
      _.isEqual(selectedQueryIndex, state.selectedQueryIndex) &&
      _.isEqual(selectedQueryPosition, state.selectedQueryPosition)
    ) {
      return state;
    }

    // Create decorations for highlighting
    let decorations = Decoration.none;
    if (queries && queries.length >= 2 && selectedQueryPosition) {
      const mark = Decoration.mark({
        class: "cm-query-highlight",
      });
      decorations = Decoration.set([
        mark.range(selectedQueryPosition.from, selectedQueryPosition.to)
      ]);
    }

    // Call the callback if provided
    if (callback && queries[selectedQueryIndex]) {
      callback({
        queries,
        selectedQuery: queries[selectedQueryIndex],
      });
    }

    return {
      queries,
      selectedQueryIndex,
      selectedQueryPosition,
      decorations,
    };
  },

  provide: f => EditorView.decorations.from(f, state => state.decorations)
});

// Extension factory function
export function querySelection(
  dialect: Options["dialect"],
  onQuerySelectionChange: (params: QuerySelectionChangeParams) => void
): Extension {
  return [
    dialectState,
    callbackState,
    querySelectionState,
    EditorView.updateListener.of((update) => {
      if (update.docChanged || update.selectionSet) {
        // Trigger state update by dispatching effects
        const effects = [];
        if (update.view.state.field(dialectState) !== dialect) {
          effects.push(setDialectEffect.of(dialect));
        }
        if (update.view.state.field(callbackState) !== onQuerySelectionChange) {
          effects.push(setCallbackEffect.of(onQuerySelectionChange));
        }

        if (effects.length > 0) {
          update.view.dispatch({ effects });
        }
      }
    }),
  ];
}
