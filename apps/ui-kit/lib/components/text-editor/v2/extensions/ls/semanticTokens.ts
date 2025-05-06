import {
  Extension,
  StateEffect,
  StateField,
  RangeSet,
  Range,
} from "@codemirror/state";
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
} from "@codemirror/view";
import Client from "@open-rpc/client-js";
import type * as LSP from "vscode-languageserver-protocol";
import { lsContextFacet } from "./ls";
import { posToOffset } from "./utils";

const SEMANTIC_TOKENS_THROTTLE_TIME = 500;

/**
 * StateEffect to set the semantic tokens timer
 */
const setSemanticTokensTimer = StateEffect.define<NodeJS.Timeout | null>();

/**
 * StateField to track the semantic tokens timer
 */
const semanticTokensTimerField = StateField.define<NodeJS.Timeout | null>({
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
 * StateField to store semantic token decorations and resultId
 */
const semanticTokensField = StateField.define<
  DecorationSet & { resultId?: string }
>({
  create() {
    return Object.assign(Decoration.none, { resultId: undefined });
  },
  update(decorations, tr) {
    // Update the decorations when semantic tokens change
    for (const e of tr.effects) {
      if (e.is(addSemanticTokens)) {
        const newDecorations = createTokenDecorations(
          tr.state.doc,
          e.value.tokens,
          e.value.legend
        );
        // Store the resultId with the decorations for future delta requests
        return Object.assign(newDecorations, {
          resultId: e.value.tokens.resultId,
        });
      }
    }

    // Otherwise, adjust the decoration positions for document changes
    return Object.assign(decorations.map(tr.changes), {
      resultId: decorations.resultId,
    });
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
    const line = previousLine + deltaLine;
    const startChar = deltaLine > 0 ? deltaChar : previousStartChar + deltaChar;

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
      line: line,
      character: startChar,
    });
    const to = posToOffset(doc, {
      line: line,
      character: startChar + length,
    });

    if (from !== undefined && to !== undefined) {
      // Create decoration with appropriate CSS classes for token type and modifiers
      // Fix class format: use hyphen instead of dot for modifiers to avoid CSS selector issues
      const tokenClass = `cm-semanticToken-${tokenType}`;
      const modifierClasses = tokenModifiers
        .map((mod) => `cm-semanticToken-${tokenType}-${mod}`)
        .join(" ");

      const classString =
        tokenClass + (modifierClasses ? ` ${modifierClasses}` : "");

      const decoration = Decoration.mark({
        class: classString,
      });

      decorations.push(decoration.range(from, to));
    }

    // Update variables for next iteration at the end of the loop
    previousLine = line;
    previousStartChar = startChar;
  }

  // Variables are updated within the loop

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

  // Request semantic tokens from server

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
        client.languageServerClient.capabilities?.semanticTokensProvider
          ?.full &&
        typeof client.languageServerClient.capabilities.semanticTokensProvider
          .full === "object" &&
        client.languageServerClient.capabilities.semanticTokensProvider.full
          .delta
      ) {
        try {
          // Request semantic tokens delta
          const delta = await client.rpcClient.request(
            {
              method: "textDocument/semanticTokens/full/delta",
              params: {
                textDocument: { uri: documentUri },
                previousResultId: lastResultId,
              },
            },
            typeof timeout === "number" ? timeout : 30000
          );

          // If we get delta with edits, process accordingly
          if (delta && "edits" in delta) {
            // In a real implementation we would apply edits to previous tokens
            // For simplicity, we'll request full tokens instead
            // Delta tokens received, requesting full tokens instead
            result = await requestFullSemanticTokens(
              client.rpcClient,
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
            client.rpcClient,
            documentUri,
            typeof timeout === "number" ? timeout : 30000
          );
        }
      } else {
        // Request full semantic tokens
        result = await requestFullSemanticTokens(
          client.rpcClient,
          documentUri,
          timeout
        );
      }

      // Apply tokens to editor
      if (result) {
        // Get capabilities using the getter function to avoid race conditions
        const { client } = view.state.facet(lsContextFacet);
        const capabilities = client.getCapabilities();

        // Use the capabilities from the getter instead of directly from client.capabilities
        const legend = capabilities?.semanticTokensProvider?.legend;
        if (legend) {
          view.dispatch({
            effects: addSemanticTokens.of({
              tokens: result,
              legend,
            }),
          });
        } else {
          // Create a complete fallback legend using the same token types we declare in capabilities
          const fallbackLegend: LSP.SemanticTokensLegend = {
            tokenTypes: [
              "namespace",
              "type",
              "class",
              "enum",
              "interface",
              "struct",
              "typeParameter",
              "parameter",
              "variable",
              "property",
              "enumMember",
              "event",
              "function",
              "method",
              "macro",
              "keyword",
              "modifier",
              "comment",
              "string",
              "number",
              "regexp",
              "operator",
              "decorator",
            ],
            tokenModifiers: [
              "declaration",
              "definition",
              "readonly",
              "static",
              "deprecated",
              "abstract",
              "async",
              "modification",
              "documentation",
              "defaultLibrary",
            ],
          };

          view.dispatch({
            effects: addSemanticTokens.of({
              tokens: result,
              legend: fallbackLegend,
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
  client: Client,
  documentUri: string,
  timeout: number | NodeJS.Timeout
): Promise<LSP.SemanticTokens | null> {
  return await client.request(
    {
      method: "textDocument/semanticTokens/full",
      params: {
        textDocument: { uri: documentUri },
      },
    },
    typeof timeout === "number" ? timeout : 30000
  );
}

/**
 * Interface kept for reference, but not used anymore as styling is now handled via CSS
 * @deprecated Use CSS variables in text-editor.scss instead
 */
export interface SemanticTokensThemeOptions {}

/**
 * We're not defining default token styles here anymore.
 * Styles are now defined in text-editor.scss using CSS variables for easy theming.
 */
const defaultTokenTypeStyles: Record<string, Partial<CSSStyleDeclaration>> = {};

/**
 * Default token modifier styles are now defined in CSS.
 */
const defaultModifierStyles: Record<string, Partial<CSSStyleDeclaration>> = {};

/**
 * Create an extension for semantic tokens
 * All styling is now handled via CSS in text-editor.scss
 */
export function semanticTokens(): Extension {
  return [
    semanticTokensField,
    semanticTokensTimerField,

    // Automatically request semantic tokens on initialization
    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          const { client } = view.state.facet(lsContextFacet);
          client.onReady((capabilities) => {
            if (capabilities.semanticTokensProvider) {
              requestSemanticTokens(view);
            }
          });
        }
      }
    ),

    // Automatically request semantic tokens on view updates and document changes
    EditorView.updateListener.of((update) => {
      // Request tokens on initialization and when the document changes
      if (
        update.docChanged ||
        update.startState.facet(lsContextFacet) !==
          update.state.facet(lsContextFacet)
      ) {
        const { client } = update.state.facet(lsContextFacet);
        const capabilities = client.getCapabilities();

        // Only request tokens if semantic tokens provider is available
        if (capabilities?.semanticTokensProvider) {
          // Get current token resultId from the decorated tokens if available
          const lastResultId = update.state.field(semanticTokensField).resultId;
          requestSemanticTokens(update.view, lastResultId);
        }
      }
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
