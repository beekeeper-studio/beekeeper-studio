import { Compartment, EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  EditorView,
  GutterMarker,
  gutter,
  lineNumbers as originalLineNumbers,
} from "@codemirror/view";

export interface LineNumbersConfiguration {
  enabled: boolean;
  /** Relative numbers only apply while the vim keymap is active. */
  vim?: boolean;
}

/** Vim's `number` and `relativenumber` options. */
export interface VimLineNumberOptions {
  number: boolean;
  relativenumber: boolean;
}

interface LineNumbersState extends VimLineNumberOptions {
  enabled: boolean;
  vim: boolean;
}

const lineNumbersCompartment = new Compartment();

const updateLineNumbers = StateEffect.define<Partial<LineNumbersState>>();

/**
 * The global values, set by the vimrc (or `:set` without a local scope) and
 * picked up by every editor created afterwards.
 */
const globalVimOptions: VimLineNumberOptions = {
  // Line numbers show by default, so the editor starts out as if `set number`.
  number: true,
  relativenumber: false,
};

const lineNumbersState = StateField.define<LineNumbersState>({
  create: () => ({ enabled: true, vim: false, ...globalVimOptions }),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(updateLineNumbers)) {
        value = { ...value, ...effect.value };
      }
    }
    return value;
  },
});

class NumberMarker extends GutterMarker {
  constructor(readonly label: string) {
    super();
  }

  eq(other: NumberMarker) {
    return this.label === other.label;
  }

  toDOM() {
    return document.createTextNode(this.label);
  }
}

/** Matches codemirror's own gutter so the width doesn't jump between modes. */
function maxLineNumber(lines: number) {
  let last = 9;
  while (last < lines) last = last * 10 + 9;
  return last;
}

export function relativeLineNumberLabel(
  lineNo: number,
  cursorLineNo: number,
  hybrid: boolean
): string {
  if (lineNo === cursorLineNo) {
    return String(hybrid ? lineNo : 0);
  }
  return String(Math.abs(lineNo - cursorLineNo));
}

function cursorLineNumber(state: EditorState) {
  return state.doc.lineAt(state.selection.main.head).number;
}

const relativeLineNumbers = gutter({
  class: "cm-lineNumbers",
  lineMarker(view, line) {
    const state = view.state;
    return new NumberMarker(
      relativeLineNumberLabel(
        state.doc.lineAt(line.from).number,
        cursorLineNumber(state),
        state.field(lineNumbersState).number
      )
    );
  },
  // The built-in gutter only redraws on doc or viewport changes, but relative
  // numbers depend on where the cursor is.
  lineMarkerChange: (update) =>
    cursorLineNumber(update.startState) !== cursorLineNumber(update.state) ||
    update.startState.field(lineNumbersState).number !==
      update.state.field(lineNumbersState).number,
  initialSpacer: (view) =>
    new NumberMarker(String(maxLineNumber(view.state.doc.lines))),
  updateSpacer: (spacer, update) => {
    const label = String(maxLineNumber(update.view.state.doc.lines));
    return label === (spacer as NumberMarker).label ? spacer : new NumberMarker(label);
  },
});

function buildLineNumbers(state: LineNumbersState) {
  if (!state.enabled) return [];
  if (state.vim && state.relativenumber) return relativeLineNumbers;
  return originalLineNumbers();
}

export function lineNumbers(
  config: LineNumbersConfiguration = { enabled: true }
) {
  const initial: LineNumbersState = {
    enabled: config.enabled,
    vim: !!config.vim,
    ...globalVimOptions,
  };
  return [
    lineNumbersState.init(() => initial),
    lineNumbersCompartment.of(buildLineNumbers(initial)),
  ];
}

function reconfigure(view: EditorView, changes: Partial<LineNumbersState>) {
  const next = { ...view.state.field(lineNumbersState), ...changes };
  view.dispatch({
    effects: [
      updateLineNumbers.of(changes),
      lineNumbersCompartment.reconfigure(buildLineNumbers(next)),
    ],
  });
}

/**
 * Toggle line numbers
 */
export function applyLineNumbers(view: EditorView, enabled: boolean) {
  reconfigure(view, { enabled });
}

/**
 * Called when the keymap changes, since relative numbers are vim-only. That
 * also re-applies the vimrc, which may have loaded after this editor was
 * created, so pick up its values too.
 */
export function applyVimLineNumbers(view: EditorView, vim: boolean) {
  reconfigure(view, { vim, ...globalVimOptions });
}

export function getVimLineNumberOption(
  name: keyof VimLineNumberOptions,
  view?: EditorView
): boolean {
  return view
    ? view.state.field(lineNumbersState, false)?.[name] ?? globalVimOptions[name]
    : globalVimOptions[name];
}

/** Without a view this sets the global value, which new editors start from. */
export function setVimLineNumberOption(
  name: keyof VimLineNumberOptions,
  value: boolean,
  view?: EditorView
) {
  if (!view) {
    globalVimOptions[name] = value;
    return;
  }
  if (view.state.field(lineNumbersState, false)) {
    reconfigure(view, { [name]: value });
  }
}
