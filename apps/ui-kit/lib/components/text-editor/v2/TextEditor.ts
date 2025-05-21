import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Extension, EditorState } from "@codemirror/state";
import {
  ExtensionConfiguration,
  Keybindings,
  Keymap,
  TextEditorConfiguration,
} from "./types";
import {
  extensions,
  applyKeymap,
  applyKeybindings,
  applyLineWrapping,
  applyLineNumbers,
  applyReadOnly,
} from "./extensions";
import {
  formatDocument,
  formatDocumentRange,
  ls,
  lsContextFacet,
  requestSemanticTokens,
} from "./extensions/ls";
import type * as LSP from "vscode-languageserver-protocol";

export class TextEditor {
  protected view: EditorView;
  private config: TextEditorConfiguration;
  private ls: ReturnType<typeof ls> | null;

  initialize(config: TextEditorConfiguration) {
    if (config.lsConfig) {
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
      this.config.onValueChange(newValue);
    }

    // Handle focus changes
    if (update.focusChanged) {
      if (update.view.hasFocus) {
        if (this.config.onFocus) {
          this.config.onFocus({ event: new FocusEvent("focus") });
        }
      } else {
        if (this.config.onBlur) {
          this.config.onBlur({ event: new FocusEvent("blur") });
        }
      }
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

  setKeymap(keymap: Keymap) {
    applyKeymap(this.view, keymap);
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

  getSelection(): string {
    return this.view.state.selection.main.toString();
  }

  getLsClient() {
    try {
      return this.view?.state?.facet(lsContextFacet)?.client;
    } catch (e) {
      // Client might not be initialized yet
      return null;
    }
  }

  getLsActions() {
    return {
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

  focus() {
    this.view.focus();
  }

  destroy() {
    this.view.destroy();
  }
}
