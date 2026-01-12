import { EditorView, ViewUpdate } from "@codemirror/view";
import { Extension, EditorState, Transaction, Line, StateField } from "@codemirror/state";
import { foldAll, unfoldAll } from "@codemirror/language";
import {
  EditorMarker,
  ExtensionConfiguration,
  Keybindings,
  Keymap,
  LanguageServerHelpers,
  TextEditorConfiguration,
  LanguageId,
  LineGutter,
} from "./types";
import {
  extensions,
  applyKeymap,
  applyKeybindings,
  applyLineWrapping,
  applyLineNumbers,
  applyReadOnly,
  applyLanguageId,
  applyMarkers,
  applyLineGutters,
} from "./extensions";
import {
  formatDocument,
  formatDocumentRange,
  ls,
  lsContextFacet,
  requestSemanticTokens,
} from "./extensions/ls";
import type * as LSP from "vscode-languageserver-protocol";
import { VimOptions } from "./extensions/keymap";
import { redo, selectAll, undo } from "@codemirror/commands";
import { openSearchPanel } from "@codemirror/search";

export const exposeMethods = ["ls"] as const;

export class TextEditor {
  public view: EditorView;

  private config: TextEditorConfiguration;
  private ls: ReturnType<typeof ls> | null;

  initialize(config: TextEditorConfiguration) {
    if ('lsConfig' in config && config.lsConfig) {
      if (!config.lsConfig.rootUri) {
        throw new Error(
          "Missing 'rootUri' in lsConfig. This is required to initialize the language server client."
        );
      }

      if (!config.lsConfig.documentUri) {
        throw new Error(
          "Missing 'documentUri' in lsConfig. This is required to initialize the language server client."
        );
      }

      this.ls = ls(
        {
          ...config.lsConfig,
          languageId: config.languageId,
        },
        config.onLspReady
      );
    }

    const state = EditorState.create({
      doc: config.initialValue || "",
      extensions: this.extendExtensions(config) || this.getExtensions(config),
    });

    const view = new EditorView({ state, parent: config.parent });

    if (typeof config.focus !== "undefined") {
      view.focus();
    }

    this.view = view;
    this.config = config;
  }

  extendExtensions(config: TextEditorConfiguration) {
    if (typeof config.replaceExtensions === "function") {
      return config.replaceExtensions(this.getExtensions(config));
    }
    return config.replaceExtensions;
  }

  protected getExtensions(config: ExtensionConfiguration): Extension[] {
    return [
      extensions(config),
      this.ls || [],
      EditorView.updateListener.of(this.handleUpdate.bind(this)),
    ];
  }

  private handleUpdate(update: ViewUpdate) {
    if (update.docChanged) {
      const newValue = update.state.doc.toString();
      this.config.onValueChange?.(newValue);
    }

    // Handle focus changes
    if (update.focusChanged) {
      if (update.view.hasFocus) {
        if (this.config.onFocus) {
          this.config.onFocus(new FocusEvent("focus"));
        }
      } else {
        if (this.config.onBlur) {
          this.config.onBlur(new FocusEvent("blur"));
        }
      }
    }

    if (this.config.onSelectionChange) {
      this.config.onSelectionChange(this.getSelection());
    }
  }

  setReadOnly(readOnly: boolean) {
    applyReadOnly(this.view, readOnly);
  }

  setValue(value: string) {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: value,
      },
    });
  }

  getValue() {
    return this.view.state.doc.toString();
  }

  getLength(): number {
    return this.view.state.doc.length;
  }

  getStateField(field: StateField<any>): any {
    return this.view.state.field(field);
  }

  dispatchChange(change: Transaction) {
    this.view.dispatch(change)
  }

  getLineInfo(num: number): Line {
    return this.view.state.doc.line(num);
  }

  getLineAt(pos: number): Line {
    return this.view.state.doc.lineAt(pos);
  }

  setKeymap(keymap: Keymap, options: VimOptions = {}) {
    applyKeymap(this.view, keymap, options);
  }

  setKeybindings(keybindings: Keybindings) {
    applyKeybindings(this.view, keybindings);
  }

  setLineWrapping(enabled: boolean) {
    applyLineWrapping(this.view, enabled);
  }

  setLineNumbers(enabled: boolean) {
    applyLineNumbers(this.view, enabled);
  }

  setLanguageId(languageId: LanguageId) {
    applyLanguageId(this.view, languageId);
  }

  setMarkers(markers: EditorMarker[]) {
    applyMarkers(this.view, markers);
  }

  setLineGutters(lineGutters: LineGutter[]) {
    applyLineGutters(this.view, lineGutters);
  }

  getSelection(): string {
    return this.view.state.sliceDoc(this.view.state.selection.main.from, this.view.state.selection.main.to);
  }

  execCommand(cmd: "undo" | "redo" | "selectAll" | "findAndReplace" ) {
    const currentState = {
      state: this.view.state,
      dispatch: this.view.dispatch
    }
    switch (cmd) {
      case "undo":
        undo(currentState);
        break;
      case "redo":
        redo(currentState);
        break;
      case "selectAll":
        selectAll(currentState);
        break;
      case "findAndReplace":
        openSearchPanel(this.view);
        break;
      default:
        console.warn("command not supported: ", cmd)
    }
  }

  getLsHelpers(): LanguageServerHelpers {
    return {
      getClient: () => this.getLsClient(),

      formatDocument: async (options: LSP.FormattingOptions) =>
        await formatDocument(this.view, options),

      formatDocumentRange: async (
        range: LSP.Range,
        options: LSP.FormattingOptions
      ) => await formatDocumentRange(this.view, range, options),

      requestSemanticTokens: async (lastResultId?: string) =>
        await requestSemanticTokens(this.view, lastResultId),
    };
  }

  private getLsClient() {
    try {
      return this.view?.state?.facet(lsContextFacet)?.client;
    } catch (e) {
      // Client might not be initialized yet
      return null;
    }
  }

  focus() {
    this.view.focus();
  }

  foldAll() {
    foldAll(this.view);
  }

  unfoldAll() {
    unfoldAll(this.view);
  }

  replaceSelection(value: string) {
    this.view.dispatch({
      annotations: Transaction.userEvent.of("input.paste"),
      changes: {
        from: this.view.state.selection.main.from,
        to: this.view.state.selection.main.to,
        insert: value,
      },
    });
  }

  destroy() {
    this.view.destroy();
  }
}
