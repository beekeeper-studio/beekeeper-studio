/**
 * Persist JSON Fold Extension for CodeMirror 6
 * 
 * Remembers which JSON sections were folded/collapsed and restores them
 * when the editor content changes. Useful for maintaining fold state
 * across JSON updates in the JSON viewer.
 * 
 * Usage:
 * 1. Create instance: const persist = persistJsonFold()
 * 2. Add to extensions: persist.extensions
 * 3. Before content change: persist.save()
 * 4. After content change: persist.apply()
 */

import _ from "lodash";
// FIXME (azmi): maybe use json-source-map instead?
import { findKeyPosition } from "@/lib/data/jsonViewer";
import { getLocation, JSONPath } from "jsonc-parser";
import { foldState, foldEffect, foldable } from "@codemirror/language";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { StateEffect, StateField, EditorState } from "@codemirror/state";
import rawLog from "@bksLogger";

const log = rawLog.scope("persistJsonFold");

interface State {
  foldedPaths: JSONPath[];
  /** True if a fold event was triggered by this plugin */
  ignoreFoldUpdate: boolean;
}

const setIgnoreFoldUpdate = StateEffect.define<boolean>();
const setFoldedPaths = StateEffect.define<JSONPath[]>();
const state = StateField.define<State>({
  create() {
    return {
      foldedPaths: [],
      ignoreFoldUpdate: false,
    };
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setFoldedPaths)) {
        return { ...value, foldedPaths: e.value };
      }
      if (e.is(setIgnoreFoldUpdate)) {
        return { ...value, ignoreFoldUpdate: e.value };
      }
    }
    return value;
  },
});

function findJSONPath(state: EditorState, pos: number) {
  const lineHandle = state.doc.lineAt(pos);
  const keyPosition = lineHandle.text.length - lineHandle.text.trimStart().length;

  const cursorIndex = lineHandle.from + keyPosition;

  const location = getLocation(state.doc.toString(), cursorIndex);
  return location.path;
}

const updateListener = EditorView.updateListener.of((update) => {
  if (
    update.startState.field(foldState, false) !==
    update.state.field(foldState, false) &&
    !update.state.field(state).ignoreFoldUpdate
  ) {
    onFoldUpdate(update.view);
  }
});

function onFoldUpdate(view: EditorView) {
  const folded: JSONPath[] = [];
  const foldField = view.state.field(foldState, false);
  if (foldField) {
    foldField.between(0, view.state.doc.length, (from) => {
      const path = findJSONPath(view.state, from);
      folded.push(path);
    });
  }
  setTimeout(() => {
    view.dispatch({
      effects: setFoldedPaths.of(folded),
    });
  });
}

function fold(view: EditorView) {
  const paths = view.state.field(state).foldedPaths;
  const effects = paths
    .map((jsonPath) => {
      const linePos =
        jsonPath.length === 0
          ? 0
          : findKeyPosition(view.state.doc.toString(), jsonPath);
      if (linePos === -1) return;
      const line = view.state.doc.line(linePos + 1);
      const range = foldable(view.state, line.from, line.to);
      return foldEffect.of(range);
    })
    .filter((f) => !!f);

  if (effects.length > 0) {
    view.dispatch({
      effects: setIgnoreFoldUpdate.of(true),
    });
    view.dispatch({ effects });
    view.dispatch({
      effects: setIgnoreFoldUpdate.of(false),
    });
  }
}

export function persistJsonFold() {
  let view: EditorView;
  let paths: JSONPath[] = [];

  const extensions = [
    state,
    updateListener,
    ViewPlugin.fromClass(
      class {
        constructor(v: EditorView) {
          view = v;
        }
      }
    ),
  ];

  function save() {
    if (!view) {
      log.warn("Calling `save` prematurely.");
      return;
    }
    paths = view.state.field(state).foldedPaths;
  }

  function apply() {
    if (!view) {
      log.warn("Calling `apply` prematurely.");
      return;
    }
    view.dispatch({
      effects: setFoldedPaths.of(paths),
    });
    fold(view);
  }

  return { extensions, save, apply };
}
