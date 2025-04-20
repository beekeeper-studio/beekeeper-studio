import { EditorView, ViewUpdate } from "@codemirror/view";
import { Extension, EditorState } from "@codemirror/state";
import { Keybindings, Keymap, LSClientConfiguration } from "./types";
import {
  extensions,
  applyKeymap,
  applyKeybindings,
  applyLineWrapping,
  applyLineNumbers,
  applyReadOnly,
  applyLanguageServer,
} from "./extensions";

interface TextEditorConfiguration {
  parent: HTMLElement;
  onValueChange: (value: string) => void;
  replaceExtensions?: Extension | ((extensions: Extension) => Extension);
}

export class TextEditor {
  protected view: EditorView;
  private config: TextEditorConfiguration;

  initialize(config: TextEditorConfiguration) {
    const state = EditorState.create({
      doc: "",
      extensions:
        this.extendExtensions(config.replaceExtensions) || this.getExtensions(),
    });

    // Create editor with the LSP plugin
    const view = new EditorView({
      state,
      parent: config.parent,
    });

    this.view = view;
    this.config = config;
  }

  applyLanguageServerClient(config: LSClientConfiguration) {
    applyLanguageServer(this.view, config);
  }

  extendExtensions(
    replaceExtensions: TextEditorConfiguration["replaceExtensions"]
  ) {
    if (typeof replaceExtensions === "function") {
      return replaceExtensions(this.getExtensions());
    }
    return replaceExtensions;
  }

  protected getExtensions(): Extension[] {
    return [
      extensions,
      EditorView.updateListener.of(this.handleUpdate.bind(this)),
    ];
  }

  private handleUpdate(update: ViewUpdate) {
    if (update.docChanged) {
      const newValue = update.state.doc.toString();
      this.config.onValueChange(newValue);
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

  focus() {
    this.view.focus();
  }

  destroy() {
    this.view.destroy();
  }
}
