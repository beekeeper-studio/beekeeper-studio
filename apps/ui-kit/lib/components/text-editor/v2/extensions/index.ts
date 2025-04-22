import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { keymap as specialKeymap } from "./keymap";
import { extraKeymap } from "./extraKeymap";
import { lineNumbers } from "./lineNumbers";
import { lineWrapping } from "./lineWrapping";
import { readOnly } from "./readOnly";
import { ExtensionConfiguration } from "../types";

export { applyKeybindings } from "./extraKeymap";
export { applyKeymap } from "./keymap";
export { applyLineNumbers } from "./lineNumbers";
export { applyLineWrapping } from "./lineWrapping";
export { applyReadOnly } from "./readOnly";

export function extensions(config: ExtensionConfiguration) {
  return [
    extraKeymap({ keybindings: config.keybindings }),
    specialKeymap({ keymap: config.keymap }),
    lineNumbers({ enabled: config.lineNumbers }),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
    lineWrapping({  enabled: config.lineWrapping }),
    readOnly({ enabled: config.readOnly }),
    EditorView.theme({
      "&": {
        height: `100%`,
      },
      ".cm-scroller": {
        overflow: "auto",
        height: "100%",
      },
    }),
  ];
}
