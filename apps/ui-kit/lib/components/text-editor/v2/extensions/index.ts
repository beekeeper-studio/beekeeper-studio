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
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
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
import { language } from "./language";

export { applyKeybindings } from "./extraKeymap";
export { applyKeymap } from "./keymap";
export { applyLineNumbers } from "./lineNumbers";
export { applyLineWrapping } from "./lineWrapping";
export { applyReadOnly } from "./readOnly";
export { applyLanguageId } from "./language";

// Define a custom highlight style that uses CSS classes
const customHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, class: "cm-keyword" },
  { tag: tags.comment, class: "cm-comment" },
  { tag: tags.string, class: "cm-string" },
  { tag: tags.variableName, class: "cm-variableName" },
  { tag: tags.definition(tags.variableName), class: "cm-definition" },
  { tag: tags.function(tags.variableName), class: "cm-function" },
  { tag: tags.number, class: "cm-number" },
  { tag: tags.bool, class: "cm-bool" },
  { tag: tags.null, class: "cm-null" },
  { tag: tags.className, class: "cm-className" },
  { tag: tags.propertyName, class: "cm-propertyName" },
  { tag: tags.operator, class: "cm-operator" },
  { tag: tags.punctuation, class: "cm-punctuation" },
  { tag: tags.bracket, class: "cm-bracket" },
  { tag: tags.meta, class: "cm-meta" },
  { tag: tags.atom, class: "cm-atom" },
  { tag: tags.typeName, class: "cm-typeName" },
  { tag: tags.namespace, class: "cm-namespace" },
  { tag: tags.labelName, class: "cm-labelName" },
  { tag: tags.attributeName, class: "cm-attributeName" },
  { tag: tags.attributeValue, class: "cm-attributeValue" },
  { tag: tags.heading, class: "cm-heading" },
  { tag: tags.url, class: "cm-url" },
  { tag: tags.processingInstruction, class: "cm-processingInstruction" },
  { tag: tags.special(tags.string), class: "cm-special-string" },
  { tag: tags.name, class: "cm-name" },
  { tag: tags.deleted, class: "cm-deleted" },
  { tag: tags.character, class: "cm-character" },
  { tag: tags.macroName, class: "cm-macro" },
  { tag: tags.color, class: "cm-color" },
  { tag: tags.standard(tags.name), class: "cm-standard" },
  { tag: tags.separator, class: "cm-separator" },
  { tag: tags.changed, class: "cm-changed" },
  { tag: tags.annotation, class: "cm-annotation" },
  { tag: tags.modifier, class: "cm-modifier" },
  { tag: tags.self, class: "cm-self" },
  { tag: tags.operatorKeyword, class: "cm-operatorKeyword" },
  { tag: tags.escape, class: "cm-escape" },
  { tag: tags.regexp, class: "cm-regexp" },
  { tag: tags.link, class: "cm-link" },
  { tag: tags.strong, class: "cm-strong" },
  { tag: tags.emphasis, class: "cm-emphasis" },
  { tag: tags.strikethrough, class: "cm-strikethrough" },
]);

export function extensions(config: ExtensionConfiguration) {
  return [
    specialKeymap({ keymap: config.keymap, vimOptions: config.vimOptions }),
    extraKeymap({ keybindings: config.keybindings }),
    lineNumbers({ enabled: config.lineNumbers }),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(customHighlightStyle),
    bracketMatching(),
    closeBrackets(),
    language(config.languageId),
    autocompletion({
      tooltipClass: () => "BksTextEditor-hints",
      optionClass: (completion: any) => {
        return completion.type ? `bks-autocomplete-option-${completion.type}` : "";
      }
    }),
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
