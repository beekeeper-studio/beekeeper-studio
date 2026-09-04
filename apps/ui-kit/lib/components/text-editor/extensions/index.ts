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
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import {
  autocompletion,
  acceptCompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { keymap as specialKeymap } from "./keymap";
import { extraKeymap } from "./extraKeymap";
import { lineNumbers } from "./lineNumbers";
import { lineWrapping } from "./lineWrapping";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { readOnly } from "./readOnly";
import { markers } from "./markers";
import { lineGutters } from "./lineGutters";
import { ExtensionConfiguration } from "../types";
import { language } from "./language";

export { applyKeybindings } from "./extraKeymap";
export { applyKeymap } from "./keymap";
export { applyLineNumbers } from "./lineNumbers";
export { applyLineWrapping } from "./lineWrapping";
export { applyReadOnly } from "./readOnly";
export { applyLanguageId } from "./language";
export { applyMarkers } from "./markers";
export { applyLineGutters } from "./lineGutters";

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

export function extensions(config: ExtensionConfiguration = {}) {
  return [
    specialKeymap({ keymap: config.keymap, vimOptions: config.vimOptions }),
    extraKeymap({ keybindings: config.keybindings }),
    lineNumbers({ enabled: config.lineNumbers }),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    config.foldGutters
      ? foldGutter({
        markerDOM(open) {
          const i = document.createElement("i");
          i.classList.add("material-icons", "cm-foldgutter");
          i.textContent = open
            ? "keyboard_arrow_down"
            : "keyboard_arrow_right";
          return i;
        },
      })
      : [],
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
    search({
      top: true,
    }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      { key: "Tab", run: acceptCompletion },
      indentWithTab,
      ...(config.actionsKeymap || []),
    ]),
    lineWrapping({  enabled: config.lineWrapping }),
    config.indentationMarkers
      ? indentationMarkers({
        colors: {
          light: "var(--text-editor-indent-marker-bg)",
          dark: "var(--text-editor-indent-marker-bg)",
          activeLight: "var(--text-editor-indent-marker-active-bg)",
          activeDark: "var(--text-editor-indent-marker-active-bg)",
        },
      })
      : [],
    readOnly({ enabled: config.readOnly }),
    markers({ markers: config.markers || [] }),
    lineGutters({ lineGutters: config.lineGutters || [] }),
    EditorView.theme({
      "&": {
        height: `100%`,
      },
      ".cm-scroller": {
        overflow: "auto",
        height: "100%",
      },
      // Selection
      ".cm-selectionBackground": {
        backgroundColor: "var(--text-editor-selected-bg)",
      },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
        backgroundColor: "var(--text-editor-selected-bg)",
      },
      ".cm-selectionMatch": {
        backgroundColor: "var(--text-editor-matchingselection-bg)",
      },
      // Search
      ".cm-searchMatch": {
        backgroundColor: "var(--text-editor-searchmatch-bg)",
      },
      ".cm-searchMatch-selected": {
        backgroundColor: "var(--text-editor-searchmatch-selected-bg)",
      },
      // Gutters and line numbers
      ".cm-gutters": {
        backgroundColor: "var(--text-editor-gutter-bg)",
        borderColor: "var(--text-editor-gutter-border)",
      },
      ".cm-foldgutter": {
        fontSize: "1.2rem",
        color: "var(--text-editor-foldgutter-fg)",
      },
      ".cm-foldgutter:hover": {
        color: "var(--text-editor-foldgutter-fg-hover)",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        color: "var(--text-editor-linenumber-fg)",
      },
      // Focused state
      "&.cm-focused": {
        outlineColor: "var(--text-editor-focused-outline)",
      },
      // Cursor
      ".cm-cursor": {
        borderLeftColor: "var(--text-editor-cursor-bg)",
      },
      ".cm-fat-cursor:not(.CodeMirror)": {
        backgroundColor: "var(--text-editor-fatcursor-bg)",
      },
      // Active line
      ".cm-activeLine": {
        backgroundColor: "var(--text-editor-activeline-bg)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "var(--text-editor-activeline-gutter-bg)",
      },
      ".cm-indent-markers::before": {
        left: "6px",
      },
      // Matching brackets
      "&.cm-focused .cm-matchingBracket": {
        color: "var(--text-editor-matchingbracket-fg)",
        backgroundColor: "var(--text-editor-matchingbracket-bg)",
        textDecoration: "underline",
      },
      // Marker styles
      ".cm-error": {
        backgroundColor: "var(--text-editor-error-bg)",
        borderBottom: "1px solid var(--text-editor-error-fg)",
        borderRadius: "2px",
      },
      ".cm-highlight": {
        backgroundColor: "var(--text-editor-highlight-bg)",
        borderRadius: "2px",
      },
      // Panel
      ".cm-panel": {
        backgroundColor: "var(--bks-query-editor-bg)",
        color: "var(--bks-text-dark)",
      },
      // Inherit so panels follow the app's codemirror theme, or codemirror
      // paints them #f5f5f5. The & is what outranks the app's own theme.
      "&.cm-editor .cm-panels": {
        backgroundColor: "var(--text-editor-vim-panel-bg)",
        color: "var(--text-editor-vim-panel-fg)",
      },
      "&.cm-editor .cm-panels-bottom": {
        borderTop: "var(--text-editor-vim-panel-border)",
      },
      // Here rather than the stylesheet so it outranks the vim package's own
      // theme and the .cm-panel rule above, which resolves to white.
      "&.cm-editor .cm-panels .cm-panel.cm-vim-panel": {
        backgroundColor: "var(--text-editor-vim-panel-bg)",
        color: "var(--text-editor-vim-panel-fg)",
        fontFamily: "var(--text-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)",
        fontSize: "var(--text-editor-vim-panel-font-size)",
        borderBottom: "var(--text-editor-vim-panel-border)",
        // The mode label and the ':' input swap places here, so pin the
        // metrics or the bar resizes as you type a command.
        boxSizing: "border-box",
        alignItems: "center",
        gap: "0.5rem",
        padding: "2px 10px",
        minHeight: "0",
        lineHeight: "1.5",
      },
      "&.cm-editor .cm-panels .cm-vim-panel input, &.cm-editor .cm-panels .cm-vim-panel button": {
        boxSizing: "border-box",
        height: "auto",
        margin: "0",
        padding: "0",
        border: "none",
        outline: "none",
        background: "transparent",
        color: "inherit",
        font: "inherit",
        lineHeight: "inherit",
      },
      "&.cm-editor .cm-panels .cm-vim-panel input": {
        flex: "1",
        minWidth: "0",
      },
      "&.cm-editor .cm-panels .cm-vim-panel button": {
        cursor: "default",
      },
      // Autocomplete hints
      ".cm-tooltip": {
        backgroundColor: "var(--text-editor-context-menu-bg)",
        color: "var(--text-editor-context-menu-fg)",
        borderColor: "var(--text-editor-context-menu-border)",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: "var(--text-editor-context-menu-item-bg-active)",
        color: "var(--text-editor-context-menu-item-fg-active)",
        padding: "0.2rem 0.4rem",
      },
    }),
  ];
}
