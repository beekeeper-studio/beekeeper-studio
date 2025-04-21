import {
  Extension,
  StateEffect,
  StateField,
  RangeSet,
  Range,
} from "@codemirror/state";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import type * as LSP from "vscode-languageserver-protocol";
import { lsContextFacet } from "./ls";
import { posToOffset } from "./utils";

const SEMANTIC_TOKENS_THROTTLE_TIME = 500;

/**
 * StateEffect to set the semantic tokens timer
 */
const setSemanticTokensTimer = StateEffect.define<number | null>();

/**
 * StateField to track the semantic tokens timer
 */
const semanticTokensTimerField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setSemanticTokensTimer)) return effect.value;
    }
    return value;
  },
});

/**
 * StateEffect to add semantic tokens to the editor
 */
const addSemanticTokens = StateEffect.define<{
  tokens: LSP.SemanticTokens;
  legend: LSP.SemanticTokensLegend;
}>();

/**
 * StateField to store semantic token decorations
 */
const semanticTokensField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Update the decorations when semantic tokens change
    for (const e of tr.effects) {
      if (e.is(addSemanticTokens)) {
        return createTokenDecorations(
          tr.state.doc,
          e.value.tokens,
          e.value.legend
        );
      }
    }

    // Otherwise, adjust the decoration positions for document changes
    return decorations.map(tr.changes);
  },
  provide(field) {
    return EditorView.decorations.from(field);
  },
});

/**
 * Create decorations from semantic tokens data
 */
function createTokenDecorations(
  doc: any,
  tokens: LSP.SemanticTokens,
  legend: LSP.SemanticTokensLegend
): DecorationSet {
  if (!tokens.data || tokens.data.length === 0) {
    return Decoration.none;
  }

  const decorations: Range<Decoration>[] = [];

  // Process token data according to LSP specification
  // Each token is represented by 5 integers: deltaLine, deltaChar, length, tokenType, tokenModifiers
  let previousLine = 0;
  let previousStartChar = 0;

  for (let i = 0; i < tokens.data.length; i += 5) {
    const deltaLine = tokens.data[i];
    const deltaChar = tokens.data[i + 1];
    const length = tokens.data[i + 2];
    const tokenTypeIdx = tokens.data[i + 3];
    const tokenModifiersIdx = tokens.data[i + 4];

    // Calculate current token position according to LSP spec:
    // - If deltaLine > 0, we've moved to a new line
    // - deltaChar is relative to start of line or previous token's start
    const currentLine = previousLine + deltaLine;
    const currentStartChar =
      deltaLine > 0 ? deltaChar : previousStartChar + deltaChar;

    // Get token type and modifiers
    const tokenType = legend.tokenTypes[tokenTypeIdx] || "unknown";
    const tokenModifiers: string[] = [];

    // Convert tokenModifiersIdx bitmap to array of modifier strings
    let bitmap = tokenModifiersIdx;
    for (let j = 0; bitmap > 0 && j < legend.tokenModifiers.length; j++) {
      if ((bitmap & 1) !== 0) {
        tokenModifiers.push(legend.tokenModifiers[j]);
      }
      bitmap = bitmap >> 1;
    }

    // Calculate token range
    const from = posToOffset(doc, {
      line: currentLine,
      character: currentStartChar,
    });
    const to = posToOffset(doc, {
      line: currentLine,
      character: currentStartChar + length,
    });

    if (from !== undefined && to !== undefined) {
      // Create decoration with appropriate CSS classes for token type and modifiers
      const decoration = Decoration.mark({
        class: `cm-semanticToken-${tokenType} ${tokenModifiers
          .map((mod) => `cm-semanticToken-${tokenType}.${mod}`)
          .join(" ")}`,
      });

      decorations.push(decoration.range(from, to));
    }
  }

  // Store current position for next token calculation
  previousLine = currentLine;
  previousStartChar = currentStartChar;

  return RangeSet.of(decorations);
}

/**
 * Request full semantic tokens from the language server
 */
export async function requestSemanticTokens(
  view: EditorView,
  lastResultId?: string
) {
  const semanticTokensTimer = view.state.field(semanticTokensTimerField, false);
  const { client, timeout, documentUri } = view.state.facet(lsContextFacet);

  // Clear any pending semantic tokens operations
  if (semanticTokensTimer) {
    clearTimeout(semanticTokensTimer);
  }

  // Throttle to avoid multiple rapid semantic token requests
  const timer = setTimeout(async () => {
    try {
      let result: LSP.SemanticTokens | null = null;

      // If we have a lastResultId, try to request delta
      if (
        lastResultId &&
        client.capabilities?.semanticTokensProvider?.full?.delta
      ) {
        try {
          const delta = await client.request(
            {
              method: "textDocument/semanticTokens/full/delta",
              params: {
                textDocument: { uri: documentUri },
                previousResultId: lastResultId,
              },
            },
            timeout
          );

          // If we get delta with edits, process accordingly
          if (delta && "edits" in delta) {
            // In a real implementation we would apply edits to previous tokens
            // For simplicity, we'll request full tokens instead
            console.log(
              "Delta tokens received, requesting full tokens instead"
            );
            result = await requestFullSemanticTokens(
              client,
              documentUri,
              timeout
            );
          } else {
            result = delta;
          }
        } catch (error) {
          console.error("Error requesting semantic tokens delta:", error);
          // Fall back to full request on error
          result = await requestFullSemanticTokens(
            client,
            documentUri,
            timeout
          );
        }
      } else {
        // Request full semantic tokens
        result = await requestFullSemanticTokens(client, documentUri, timeout);
      }

      // Apply tokens to editor
      if (result) {
        const legend = client.capabilities?.semanticTokensProvider?.legend;
        if (legend) {
          view.dispatch({
            effects: addSemanticTokens.of({
              tokens: result,
              legend,
            }),
          });
        }
        return result.resultId || undefined;
      }
    } catch (error) {
      console.error("Error requesting semantic tokens:", error);
    }
  }, SEMANTIC_TOKENS_THROTTLE_TIME);

  view.dispatch({
    effects: setSemanticTokensTimer.of(timer),
  });
}

/**
 * Request full semantic tokens from the language server
 */
async function requestFullSemanticTokens(
  client: any,
  documentUri: string,
  timeout: number
): Promise<LSP.SemanticTokens | null> {
  return await client.request(
    {
      method: "textDocument/semanticTokens/full",
      params: {
        textDocument: { uri: documentUri },
      },
    },
    timeout
  );
}

/**
 * Create an extension for semantic tokens
 */
export function semanticTokens(): Extension {
  return [
    semanticTokensField,
    semanticTokensTimerField,
    // Add CSS for semantic token styling
    EditorView.theme({
      // Modify these classes to match your color theme
      ".cm-semanticToken-type": { color: "#4EC9B0" },
      ".cm-semanticToken-class": { color: "#4EC9B0" },
      ".cm-semanticToken-enum": { color: "#4EC9B0" },
      ".cm-semanticToken-interface": { color: "#4EC9B0" },
      ".cm-semanticToken-struct": { color: "#4EC9B0" },
      ".cm-semanticToken-typeParameter": { color: "#4EC9B0" },
      ".cm-semanticToken-parameter": { color: "#9CDCFE" },
      ".cm-semanticToken-variable": { color: "#9CDCFE" },
      ".cm-semanticToken-property": { color: "#9CDCFE" },
      ".cm-semanticToken-enumMember": { color: "#9CDCFE" },
      ".cm-semanticToken-decorator": { color: "#DCDCAA" },
      ".cm-semanticToken-event": { color: "#DCDCAA" },
      ".cm-semanticToken-function": { color: "#DCDCAA" },
      ".cm-semanticToken-method": { color: "#DCDCAA" },
      ".cm-semanticToken-macro": { color: "#DCDCAA" },
      ".cm-semanticToken-label": { color: "#C8C8C8" },
      ".cm-semanticToken-comment": { color: "#6A9955" },
      ".cm-semanticToken-string": { color: "#CE9178" },
      ".cm-semanticToken-keyword": { color: "#569CD6" },
      ".cm-semanticToken-number": { color: "#B5CEA8" },
      ".cm-semanticToken-regexp": { color: "#D16969" },
      ".cm-semanticToken-operator": { color: "#D4D4D4" },
      ".cm-semanticToken-namespace": { color: "#D4D4D4" },

      // Modifiers
      ".cm-semanticToken-*.static": { fontStyle: "italic" },
      ".cm-semanticToken-*.declaration": { textDecoration: "underline" },
      ".cm-semanticToken-*.deprecated": { textDecoration: "line-through" },
      ".cm-semanticToken-*.readonly": { fontStyle: "italic" },
    }),
  ];
}

export function semanticTokensCapabilities(
  defaultCapabilities: LSP.ClientCapabilities
): LSP.ClientCapabilities {
  return {
    ...defaultCapabilities,
    textDocument: {
      ...defaultCapabilities.textDocument,
      semanticTokens: {
        dynamicRegistration: true,
        // prettier-ignore
        tokenTypes: [
          "namespace", "type", "class", "enum", "interface", "struct",
          "typeParameter", "parameter", "variable", "property", "enumMember",
          "event", "function", "method", "macro", "keyword", "modifier",
          "comment", "string", "number", "regexp", "operator", "decorator"
        ],
        // prettier-ignore
        tokenModifiers: [
          "declaration", "definition", "readonly", "static", "deprecated",
          "abstract", "async", "modification", "documentation", "defaultLibrary"
        ],
        formats: ["relative"],
        requests: {
          range: true,
          full: {
            delta: true,
          },
        },
        multilineTokenSupport: true,
        overlappingTokenSupport: true,
      },
    },
  };
}
