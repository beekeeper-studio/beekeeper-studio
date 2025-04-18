import { LanguageServerClient } from "@marimo-team/codemirror-languageserver";
import { languageServerWithClient } from "@marimo-team/codemirror-languageserver";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { completionKeymap, startCompletion } from "@codemirror/autocomplete";
import { URI } from "vscode-uri";
import { defaultKeymap } from "@codemirror/commands";
import { WebSocketTransport } from "@open-rpc/client-js";
import { sql } from "@codemirror/lang-sql";
import { Compartment } from "@codemirror/state";
import { LSClientConfiguration } from "./types";

interface TextEditorConfiguration {
  parent: HTMLElement;
}

export class TextEditor {
  private initialized = false;
  private view: EditorView;
  private readOnlyCompartment = new Compartment();
  private lsCompartment = new Compartment();

  initialize(config: TextEditorConfiguration) {
    const state = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        keymap.of([
          ...defaultKeymap,
          ...completionKeymap,
          { key: "Ctrl-Space", run: startCompletion },
        ]),
        this.readOnlyCompartment.of(EditorState.readOnly.of(true)),
        sql(),
        this.lsCompartment.of([]),
      ],
    });

    // Create editor with the LSP plugin
    const view = new EditorView({
      state,
      parent: config.parent,
    });

    this.view = view;
    this.initialized = true;
  }

  initializeLSClientConfig(config: LSClientConfiguration) {
    if (!this.initialized) {
      console.warn("Text Editor must be initialized first.");
      return;
    }

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

  destroy() {
    this.view.destroy();
  }
}
