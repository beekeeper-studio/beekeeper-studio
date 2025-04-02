/**
 * This plugin stores JSON paths that should be folded in the editor and
 * restores them when the editor value changes.
 **/

import _ from "lodash";
// FIXME (azmi): maybe use json-source-map instead?
import { findKeyPosition } from "@/lib/data/jsonViewer";
import { getLocation, JSONPath } from "jsonc-parser";
import CodeMirror from "codemirror";

type EditorInstance = CodeMirror.Editor & {
  bksPersistJsonFold: {
    foldedPaths: JSONPath[];
    /** True if a fold event was triggered by this plugin */
    ignoreFoldEvent: boolean;
  };
};

export function registerPersistJsonFold(instance: EditorInstance) {
  if (!instance.getOption("foldGutter")) {
    throw new Error("PersistJsonFold requires foldGutter to be enabled.");
  }
  instance.bksPersistJsonFold = {
    foldedPaths: [],
    ignoreFoldEvent: false,
  };
  // @ts-expect-error not fully typed
  instance.on("fold", handleFold);
  // @ts-expect-error not fully typed
  instance.on("unfold", handleUnfold);
  instance.on("change", handleChange);
  return () => {
    delete instance.bksPersistJsonFold;
    // @ts-expect-error not fully typed
    instance.off("fold", handleFold);
    // @ts-expect-error not fully typed
    instance.off("unfold", handleUnfold);
    instance.off("change", handleChange);
  };
}

export const persistJsonFold = registerPersistJsonFold;

function findJSONPath(cm: CodeMirror.Editor, line: number) {
  const lineHandle = cm.getLineHandle(line);
  const keyPosition = lineHandle.text.length - lineHandle.text.trimStart().length;

  const cursorPos = { line, ch: keyPosition };
  const cursorIndex = cm.indexFromPos(cursorPos);

  const location = getLocation(cm.getValue(), cursorIndex);
  return location.path;
}

function handleFold(
  instance: EditorInstance,
  from: CodeMirror.Position,
  _to: CodeMirror.Position
) {
  if (instance.bksPersistJsonFold.ignoreFoldEvent) {
    return
  }
  const path = findJSONPath(instance, from.line);
  instance.bksPersistJsonFold.foldedPaths.push(path);
}

function handleUnfold(
  instance: EditorInstance,
  from: CodeMirror.Position,
  _to: CodeMirror.Position
) {
  const path = findJSONPath(instance, from.line);
  instance.bksPersistJsonFold.foldedPaths =
    instance.bksPersistJsonFold.foldedPaths.filter((p) => !_.isEqual(p, path));
}

function handleChange(instance: EditorInstance) {
  const value = instance.getValue();
  instance.bksPersistJsonFold.foldedPaths.forEach((path) => {
    const line = findKeyPosition(value, path);
    if (line === -1) {
      return
    }
    instance.bksPersistJsonFold.ignoreFoldEvent = true
    // @ts-expect-error not fully typed
    instance.foldCode(line);
    instance.bksPersistJsonFold.ignoreFoldEvent = false
  });
}
