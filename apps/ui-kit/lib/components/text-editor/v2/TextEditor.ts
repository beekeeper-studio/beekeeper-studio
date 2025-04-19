import { LanguageServerClient } from "@marimo-team/codemirror-languageserver";
import { languageServerWithClient } from "@marimo-team/codemirror-languageserver";
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  lineNumbers,
  highlightActiveLineGutter,
  ViewUpdate,
} from "@codemirror/view";
import { Extension, EditorState } from "@codemirror/state";
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
import { emacs } from "@replit/codemirror-emacs";
import { vim } from "@replit/codemirror-vim";
import { lintKeymap } from "@codemirror/lint";
import { URI } from "vscode-uri";
import { WebSocketTransport } from "@open-rpc/client-js";
import { Compartment } from "@codemirror/state";
import { Keybindings, Keymap, LSClientConfiguration } from "./types";

interface TextEditorConfiguration {
  parent: HTMLElement;
  onValueChange: (value: string) => void;
}

export class TextEditor {
  protected view: EditorView;
  private keymapComparment = new Compartment();
  private lineNumbersCompartment = new Compartment();
  private extraKeymapCompartment = new Compartment();
  private lineWrappingCompartment = new Compartment();
  private readOnlyCompartment = new Compartment();
  private lsCompartment = new Compartment();
  private config: TextEditorConfiguration;

  initialize(config: TextEditorConfiguration) {
    const state = EditorState.create({
      doc: "",
      extensions: this.getBaseExtensions(),
    });

    // Create editor with the LSP plugin
    const view = new EditorView({
      state,
      parent: config.parent,
    });

    this.view = view;
    this.config = config;
  }

  initializeLSClientConfig(config: LSClientConfiguration) {
    const rootUri = URI.file(config.rootUri).toString();
    const documentUri = URI.file(config.documentUri).toString();
    const transport = new WebSocketTransport("ws://localhost:3000/server");

    transport.connection.addEventListener("message", function () {
      if (arguments[0].data) {
        try {
          const jsonrpc = JSON.parse(arguments[0].data);
          if (jsonrpc.method === "workspace/configuration") {
            transport.connection.send(
              JSON.stringify({
                jsonrpc: "2.0",
                id: jsonrpc.id,
                result: [null],
              })
            );
          }
        } catch {
          // do nothing
        }
      }
    });

    const lsClient = new LanguageServerClient({
      transport,
      rootUri,
      workspaceFolders: [
        {
          name: "workspace",
          uri: rootUri.toString(),
        },
      ],
    });

    const lsExtension = languageServerWithClient({
      client: lsClient,
      allowHTMLContent: true,
      documentUri,
      languageId: config.languageId,
      keyboardShortcuts: {
        rename: "",
        signatureHelp: "",
        goToDefinition: "",
      },
    });

    this.view.dispatch({
      effects: this.lsCompartment.reconfigure(lsExtension),
    });
  }

  protected getBaseExtensions(): Extension[] {
    return [
      this.extraKeymapCompartment.of([]),
      this.keymapComparment.of([]),
      this.lineNumbersCompartment.of(lineNumbers()),
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
      this.lineWrappingCompartment.of([]),
      EditorView.updateListener.of(this.handleUpdate.bind(this)),
      this.readOnlyCompartment.of(EditorState.readOnly.of(true)),
      this.lsCompartment.of([]),
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

  private handleUpdate(update: ViewUpdate) {
    if (update.docChanged) {
      const newValue = update.state.doc.toString();
      this.config.onValueChange(newValue);
    }
  }

  setReadOnly(readOnly: boolean) {
    this.view.dispatch({
      effects: this.readOnlyCompartment.reconfigure(
        EditorState.readOnly.of(readOnly)
      ),
    });
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
    let extension: Extension = [];

    if (keymap === "vim") {
      extension = vim();
    } else if (keymap === "emacs") {
      extension = emacs();
    }

    this.view.dispatch({
      effects: this.keymapComparment.reconfigure(extension),
    });
  }

  setKeybindings(keybindings: Keybindings) {
    const extraKeymap = Object.keys(keybindings).map((key) => ({
      key,
      run: () => {
        keybindings[key]();
        return true;
      },
    }));
    this.view.dispatch({
      effects: this.extraKeymapCompartment.reconfigure(keymap.of(extraKeymap)),
    });
  }

  setLineWrapping(enabled: boolean) {
    this.view.dispatch({
      effects: this.lineWrappingCompartment.reconfigure(
        enabled ? EditorView.lineWrapping : []
      ),
    });
  }

  setLineNumbers(enabled: boolean) {
    this.view.dispatch({
      effects: this.lineNumbersCompartment.reconfigure(
        enabled ? lineNumbers() : []
      ),
    });
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
