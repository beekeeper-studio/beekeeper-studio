import {
  unifiedMergeView,
  updateOriginalDoc,
  getOriginalDoc,
} from "@codemirror/merge";
import { ChangeSet, Compartment, EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export type MergeOptions = {
  originalText: string;
};

const compartment = new Compartment();

function createMerge(options: MergeOptions) {
  return unifiedMergeView({
    original: options.originalText,
    mergeControls: false,
  });
}

export function merge(options: MergeOptions) {
  return compartment.of(createMerge(options));
}

export function disableMerge(view: EditorView) {
  view.dispatch({ effects: compartment.reconfigure([]) });
}

export function enableMerge(view: EditorView, options: MergeOptions) {
  view.dispatch({ effects: compartment.reconfigure(createMerge(options)) });
}

export function setOriginalText(view: EditorView, newOriginal: string) {
  const oldOriginal = getOriginalDoc(view.state);
  const changes = ChangeSet.of(
    { from: 0, to: oldOriginal.length, insert: newOriginal },
    oldOriginal.length
  );
  const doc = changes.apply(oldOriginal);
  view.dispatch({ effects: updateOriginalDoc.of({ changes, doc }) });
}
