import _ from "lodash";
import CodeMirror, { TextMarker } from "codemirror";
import { identify, Options } from "sql-query-identifier";
import { IdentifyResult } from "sql-query-identifier/lib/defines";

export interface QuerySelectionChangeParams {
  queries: IdentifyResult[];
  selectedQuery: IdentifyResult;
}

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

function getSelectedQueryIndex(queries: IdentifyResult[], cursorIndex: number) {
  for (let i = 0; i < queries.length; i++) {
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

function locationFromPosition(cm, queryText, ...rawPositions) {
  // 1. find the query text inside the editor
  // 2.

  const editorText = cm.getValue();

  const startCharacter = editorText.indexOf(queryText);
  const lines = editorText.split(/\n/);
  const positions = rawPositions.map((p) => p + startCharacter);

  const finished = positions.map((_p) => false);
  const results = positions.map((_p) => ({ line: null, ch: null }));

  let startOfLine = 0;
  lines.forEach((line, idx) => {
    const eol = startOfLine + line.length + 1;
    positions.forEach((p, pIndex) => {
      if (startOfLine <= p && p <= eol && !finished[pIndex]) {
        results[pIndex].line = idx;
        results[pIndex].ch = p - startOfLine;
        finished[pIndex] = true;
      }
    });
    startOfLine += line.length + 1;
  });
  return results;
}

function markSelection(
  cm: CodeMirror.Editor,
  selectedQueryPosition: { from: number; to: number }
) {
  const { from, to } = selectedQueryPosition;

  const editorText = cm.getValue();
  // const lines = editorText.split(/\n/)

  const [markStart, markEnd] = locationFromPosition(cm, editorText, from, to);

  return cm.markText(markStart, markEnd, {
    className: "highlight",
  });
}

function querySelectionHandler(
  dialect: Options["dialect"],
  onQuerySelectionChange: (params: QuerySelectionChangeParams) => void,
  cm: CodeMirror.Editor
) {
  const cursorIndex = cm.getDoc().indexFromPos(cm.getCursor());
  const queries = splitQueries(cm.getValue(), dialect);
  const selectedQueryIndex = getSelectedQueryIndex(queries, cursorIndex);
  const selectedQueryPosition = getSelectedQueryPosition(
    queries,
    selectedQueryIndex
  );

  if (
    _.isEqual(queries, cm.bksQuerySelection.queries) &&
    _.isEqual(selectedQueryIndex, cm.bksQuerySelection.selectedQueryIndex) &&
    _.isEqual(selectedQueryPosition, cm.bksQuerySelection.selectedQueryPosition)
  ) {
    // Do nothing if nothing has changed
    return;
  }

  cm.bksQuerySelection.queries = queries;
  cm.bksQuerySelection.selectedQueryIndex = selectedQueryIndex;
  cm.bksQuerySelection.selectedQueryPosition = selectedQueryPosition;

  onQuerySelectionChange({
    queries,
    selectedQuery: queries[selectedQueryIndex],
  });

  // @ts-expect-error not fully typed
  cm.bksQuerySelection.markerInstances.forEach((marker: TextMarker) => {
    marker.clear();
  });

  if (!queries || queries.length < 2 || !selectedQueryPosition) {
    return;
  }

  const marker = markSelection(cm, selectedQueryPosition);
  // @ts-expect-error not fully typed
  cm.bksQuerySelection.markerInstances.push(marker);
}

function registerQuerySelection(
  dialect: Options["dialect"],
  onQuerySelectionChange: (params: QuerySelectionChangeParams) => void,
  instance: CodeMirror.Editor
) {
  const handler = querySelectionHandler.bind(
    null,
    dialect,
    onQuerySelectionChange
  );
  // @ts-expect-error not fully typed
  instance.bksQuerySelection = {
    markerInstances: [],
    queries: [],
    selectedQueryIndex: -1,
    selectedQueryPosition: null,
  };
  instance.on("cursorActivity", handler);
  return () => instance.off("cursorActivity", handler);
}

export const querySelection = (
  dialect: Options["dialect"],
  onQuerySelectionChange: (params: QuerySelectionChangeParams) => void
) => registerQuerySelection.bind(null, dialect, onQuerySelectionChange);
