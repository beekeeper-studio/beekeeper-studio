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
        backgroundColor: "var(--bks-text-editor-selected-bg-color)",
      },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
        backgroundColor: "var(--bks-text-editor-selected-bg-color)",
      },
      ".cm-selectionMatch": {
        backgroundColor: "var(--bks-text-editor-matchingselection-bg-color)",
      },
      // Search
      ".cm-searchMatch": {
        backgroundColor: "var(--bks-text-editor-searchmatch-bg-color)",
      },
      ".cm-searchMatch-selected": {
        backgroundColor: "var(--bks-text-editor-searchmatch-selected-bg-color)",
      },
      // Gutters and line numbers
      ".cm-gutters": {
        backgroundColor: "var(--bks-text-editor-gutter-bg-color)",
        borderColor: "var(--bks-text-editor-gutter-border-color)",
      },
      ".cm-foldgutter": {
        fontSize: "1.2rem",
        color: "var(--bks-text-editor-foldgutter-fg-color)",
      },
      ".cm-foldgutter:hover": {
        color: "var(--bks-text-editor-foldgutter-fg-color-hover)",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        color: "var(--bks-text-editor-linenumber-fg-color)",
      },
      // Focused state
      "&.cm-focused": {
        outlineColor: "var(--bks-text-editor-focused-outline-color)",
      },
      // Cursor
      ".cm-cursor": {
        borderLeftColor: "var(--bks-text-editor-cursor-bg-color)",
      },
      ".cm-fat-cursor:not(.CodeMirror)": {
        backgroundColor: "var(--bks-text-editor-fatcursor-bg-color)",
      },
      // Active line
      ".cm-activeLine": {
        backgroundColor: "var(--bks-text-editor-activeline-bg-color)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "var(--bks-text-editor-activeline-gutter-bg-color)",
      },
      // Matching brackets
      "&.cm-focused .cm-matchingBracket": {
        color: "var(--bks-text-editor-matchingbracket-fg-color)",
        backgroundColor: "var(--bks-text-editor-matchingbracket-bg-color)",
        textDecoration: "underline",
      },
      // Marker styles
      ".cm-error": {
        backgroundColor: "var(--bks-text-editor-error-bg-color)",
        borderBottom: "1px solid var(--bks-text-editor-error-fg-color)",
        borderRadius: "2px",
      },
      ".cm-highlight": {
        backgroundColor: "var(--bks-text-editor-highlight-bg-color)",
        borderRadius: "2px",
      },
      // Panel
      ".cm-panel": {
        backgroundColor: "var(--bks-query-editor-bg)",
        color: "var(--bks-text-dark)",
      },
      // Every EditorView.theme gets its own generated scope class, and they
      // all sit at the same specificity, so a plain ".cm-panels" rule is
      // decided purely by which theme mounted last -- and the app appends its
      // own theme after this one. Qualifying with & lifts these above any
      // single-class rule so the outcome does not depend on mount order.
      //
      // The panel container is a direct child of .cm-editor, so inheriting
      // picks up whatever background the host app themed the editor with.
      // codemirror's own base theme would otherwise paint it #f5f5f5 with
      // black text, which shows straight through the vim status line because
      // its input inherits the background.
      "&.cm-editor .cm-panels": {
        backgroundColor: "var(--bks-text-editor-vim-panel-bg-color)",
        color: "var(--bks-text-editor-vim-panel-fg-color)",
      },
      "&.cm-editor .cm-panels-bottom": {
        // Neutral and translucent so it reads against a light or a dark
        // editor. --bks-border-color would fall into the same trap as the
        // colours above and resolve against the light defaults.
        borderTop: "var(--bks-text-editor-vim-panel-border)",
      },
      // Vim's status line: current mode, pending keys, and the ':' and '/'
      // inputs. These live here rather than in the stylesheet so they outrank
      // the base theme @replit/codemirror-vim ships.
      // Note this element also carries the generic .cm-panel class, whose rule
      // above resolves to white, so this needs to outrank it.
      "&.cm-editor .cm-panels .cm-panel.cm-vim-panel": {
        backgroundColor: "var(--bks-text-editor-vim-panel-bg-color)",
        color: "var(--bks-text-editor-vim-panel-fg-color)",
        fontFamily: "var(--bks-text-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)",
        fontSize: "var(--bks-text-editor-vim-panel-font-size)",
        // Matches the top border, so the bar reads as its own strip rather
        // than running into the toolbar underneath the editor.
        borderBottom: "var(--bks-text-editor-vim-panel-border)",
        // The mode label and the ':' input swap places in here, so pin the
        // metrics to stop the bar changing height as you type a command.
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
        backgroundColor: "var(--bks-text-editor-context-menu-bg-color)",
        color: "var(--bks-text-editor-context-menu-fg-color)",
        borderColor: "var(--bks-text-editor-context-menu-border-color)",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: "var(--bks-text-editor-context-menu-item-bg-color-active)",
        color: "var(--bks-text-editor-context-menu-item-fg-color-active)",
        padding: "0.2rem 0.4rem",
      },
    }),
  ];
}
