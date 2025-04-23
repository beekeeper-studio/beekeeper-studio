import { Extension, StateEffect, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type * as LSP from "vscode-languageserver-protocol";
import { lsContextFacet } from "./ls";
import { posToOffset } from "./utils";

const FORMAT_DEBOUNCE_TIME = 100;

const setFormatTimer = StateEffect.define<NodeJS.Timeout | null>();

const formatTimerField = StateField.define<NodeJS.Timeout | null>({
  create: () => null,
  update(value, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setFormatTimer)) return effect.value;
    }
    return value;
  },
});

export function lsFormatting(): Extension {
  return [formatTimerField];
}

/**
 * Format the entire document
 */
export async function formatDocument(
  view: EditorView,
  options: LSP.FormattingOptions
) {
  const formatTimer = view.state.field(formatTimerField, false);
  const { client, timeout, documentUri } = view.state.facet(lsContextFacet);

  // Clear any pending format operations
  if (formatTimer) {
    clearTimeout(formatTimer);
  }

  // Debounce to avoid multiple rapid formatting requests
  const timer = setTimeout(async () => {
    try {
      // Request formatting from the language server
      const edits = await client.rpcClient.request(
        {
          method: "textDocument/formatting",
          params: {
            textDocument: { uri: documentUri },
            options,
          },
        },
        timeout
      );

      // Apply the edits if we got them
      if (edits && edits.length > 0) {
        applyEdits(view, edits);
      }

      return edits;
    } catch (error) {
      console.error("Error formatting document:", error);
    }
  }, FORMAT_DEBOUNCE_TIME);

  view.dispatch({
    effects: setFormatTimer.of(timer),
  });
}

export async function formatDocumentRange(
  view: EditorView,
  range: LSP.Range,
  options: LSP.FormattingOptions
) {
  const formatTimer = view.state.field(formatTimerField, false);
  const { client, timeout, documentUri } = view.state.facet(lsContextFacet);

  // Clear any pending format operations
  if (formatTimer) {
    clearTimeout(formatTimer);
  }

  // Debounce to avoid multiple rapid formatting requests
  const timer = setTimeout(async () => {
    try {
      // Request range formatting from the language server
      const edits = await client.rpcClient.request(
        {
          method: "textDocument/rangeFormatting",
          params: {
            textDocument: { uri: documentUri },
            range: range,
            options: options,
          },
        },
        typeof timeout === 'number' ? timeout : 30000
      );

      // Apply the edits if we got them
      if (edits && edits.length > 0) {
        applyEdits(view, edits);
      }
    } catch (error) {
      console.error("Error formatting document range:", error);
    }
  }, FORMAT_DEBOUNCE_TIME);

  view.dispatch({
    effects: setFormatTimer.of(timer),
  });
}
/**
 * Apply text edits to the editor
 */
function applyEdits(view: EditorView, edits: LSP.TextEdit[]) {
  if (!view || !edits || edits.length === 0) return;

  const changes = edits
    .map((edit) => {
      const from = posToOffset(view?.state.doc, edit.range.start);
      const to = posToOffset(view?.state.doc, edit.range.end);

      if (from === undefined || to === undefined) return null;

      return { from, to, insert: edit.newText };
    })
    .filter((change) => change !== null);

  if (changes.length > 0) {
    view.dispatch({ changes });
  }
}

export function formattingCapabilities(
  defaultCapabilities: LSP.ClientCapabilities
): LSP.ClientCapabilities {
  return {
    ...defaultCapabilities,
    textDocument: {
      ...defaultCapabilities.textDocument,
      formatting: {
        dynamicRegistration: true,
      },
      rangeFormatting: {
        dynamicRegistration: true,
      },
    },
  };
}
