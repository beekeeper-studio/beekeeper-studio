import { findKeyPosition } from "@/lib/data/detail_view";
import { getLocation, JSONPath } from "jsonc-parser";
import CodeMirror from "codemirror";

type EditorInstance = CodeMirror.Editor & {
  bksPersistJsonFold: {
    foldedPaths: JSONPath[];
  };
};

export function registerPersistJsonFold(instance: EditorInstance) {
  if (!instance.getOption("foldGutter")) {
    throw new Error("PersistJsonFold requires foldGutter to be enabled.");
  }
  instance.bksPersistJsonFold = { foldedPaths: [] };
  instance.on("beforeChange", beforeChangeHandle);
  instance.on("change", handleChange);
  return () => {
    delete instance.bksPersistJsonFold;
    instance.off("beforeChange", beforeChangeHandle);
    instance.off("change", handleChange);
  };
}

export const persistJsonFold = registerPersistJsonFold;

function beforeChangeHandle(instance: EditorInstance) {
  const value = instance.getValue();
  const foldedPaths = [];
  let cursor = 0;
  instance.eachLine((line) => {
    const offset = line.text.length - line.text.trimStart().length;
    const location = getLocation(value, cursor + offset);

    cursor += line.text.length + 1;

    const options = instance.state.foldGutter.options;
    // @ts-expect-error not fully typed
    const foldGutterMarker = line.gutterMarkers?.[options.gutter];

    if (!foldGutterMarker) {
      return;
    }

    const folded = foldGutterMarker.classList.contains(options.indicatorFolded);
    if (folded) {
      foldedPaths.push(location.path);
    }
  });
  instance.bksPersistJsonFold.foldedPaths = foldedPaths;
}

function handleChange(instance: EditorInstance) {
  const value = instance.getValue();
  instance.bksPersistJsonFold.foldedPaths.forEach((path: JSONPath) => {
    const line = findKeyPosition(value, path);
    // @ts-expect-error not fully typed
    instance.foldCode(line);
  });
}
