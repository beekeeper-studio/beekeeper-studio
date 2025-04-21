import { LanguageServerPlugin } from "@marimo-team/codemirror-languageserver";
import { EditorView, Decoration, ViewPlugin, ViewUpdate, DecorationSet } from "@codemirror/view";
import { StateField, Extension, StateEffect, RangeSet, Range } from "@codemirror/state";
import * as LSP from "vscode-languageserver-protocol";
import { FeatureOptions } from "@marimo-team/codemirror-languageserver/dist/plugin";

export function posToOffset(doc, pos) {
    if (pos.line >= doc.lines) {
        // Next line (implying the end of the document)
        if (pos.character === 0) {
            return doc.length;
        }
        return;
    }
    const offset = doc.line(pos.line + 1).from + pos.character;
    if (offset > doc.length) {
        return;
    }
    return offset;
}

/**
 * AddSemanticTokens effect to update the semantic tokens decorations
 */
const addSemanticTokens = StateEffect.define<{
  tokens: LSP.SemanticTokens;
  legend: LSP.SemanticTokensLegend;
}>();

/**
 * Semantic tokens StateField to store and compute decorations
 */
const semanticTokensField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Update the decorations when semantic tokens change
    for (const e of tr.effects) {
      if (e.is(addSemanticTokens)) {
        return createTokenDecorations(tr.state.doc, e.value.tokens, e.value.legend);
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
    const currentStartChar = deltaLine > 0 ? deltaChar : previousStartChar + deltaChar;
    
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
    const from = posToOffset(doc, { line: currentLine, character: currentStartChar });
    const to = posToOffset(doc, { line: currentLine, character: currentStartChar + length });

    if (from !== null && to !== null) {
      // Create decoration with appropriate CSS classes for token type and modifiers
      const decoration = Decoration.mark({
        class: `cm-semanticToken-${tokenType} ${tokenModifiers
          .map((mod) => `cm-semanticToken-${tokenType}.${mod}`)
          .join(" ")}`,
      });

      decorations.push(decoration.range(from, to));
    }

    // Store current position for next token calculation
    previousLine = currentLine;
    previousStartChar = currentStartChar;
  }

  return RangeSet.of(decorations);
}

/**
 * SemanticTokensPlugin that handles LSP semantic tokens
 *
 * This plugin requests semantic tokens from the language server and applies
 * them as CodeMirror decorations to enable syntax highlighting based on semantic
 * information from the language server.
 */
export class SemanticTokensPlugin extends LanguageServerPlugin {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private throttleMs = 500; // Throttle requests to avoid overloading server
  private legend: LSP.SemanticTokensLegend | null = null;
  private lastResultId: string | null = null;

  /**
   * Initialize the semantic tokens support
   */
  async initialize({ documentText }) {
    super.initialize({ documentText });

    if (this.client.initializePromise) {
      await this.client.initializePromise;
    }

    if (!this.client.capabilities?.semanticTokensProvider) {
      console.log("Language server doesn't support semantic tokens");
      return;
    }

    // Get the legend from the server capabilities
    this.legend = this.client.capabilities.semanticTokensProvider.legend;
    if (!this.legend) {
      console.error("No semantic tokens legend provided by language server");
      return;
    }

    // Request full semantic tokens
    await this.requestSemanticTokens();
  }

  /**
   * Override update to request tokens when document changes
   */
  update(update: ViewUpdate) {
    super.update(update);

    // If the document changed, request new tokens with throttling
    if (update.docChanged && this.client.ready && this.legend) {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        this.requestSemanticTokens();
      }, this.throttleMs);
    }
  }

  /**
   * Request semantic tokens from the language server
   */
  private async requestSemanticTokens() {
    if (!this.client.ready || !this.legend) return;

    try {
      let result: LSP.SemanticTokens | null = null;

      // If we have a previous result ID, request delta
      if (this.lastResultId && this.client.capabilities?.semanticTokensProvider?.full?.delta) {
        result = await this.requestSemanticTokensDelta();
      }

      // If delta request failed or we don't have a previous result ID, request full tokens
      if (!result) {
        result = await this.requestFullSemanticTokens();
      }

      // Apply tokens to editor
      if (result) {
        this.lastResultId = result.resultId || null;
        this.view.dispatch({
          effects: addSemanticTokens.of({ tokens: result, legend: this.legend }),
        });
      }
    } catch (error) {
      console.error("Error requesting semantic tokens:", error);
    }
  }

  /**
   * Request full semantic tokens from the language server
   */
  private async requestFullSemanticTokens(): Promise<LSP.SemanticTokens | null> {
    return await this.client.request("textDocument/semanticTokens/full", {
      textDocument: { uri: this.documentUri },
    }, this.client.timeout);
  }

  /**
   * Request semantic tokens delta from the language server
   */
  private async requestSemanticTokensDelta(): Promise<LSP.SemanticTokens | null> {
    if (!this.lastResultId) return null;

    try {
      const delta = await this.client.request("textDocument/semanticTokens/full/delta", {
        textDocument: { uri: this.documentUri },
        previousResultId: this.lastResultId,
      }, this.client.timeout);

      // Process delta response if needed
      if (delta && "edits" in delta) {
        // Convert delta to full tokens (simplified - in a real implementation this would need to
        // properly apply the edits to the previous token data)
        console.log("Delta tokens received, requesting full tokens instead");
        return await this.requestFullSemanticTokens();
      }

      return delta;
    } catch (error) {
      console.error("Error requesting semantic tokens delta:", error);
      return null;
    }
  }
}

/**
 * Create an extension for semantic tokens
 */
export function semanticTokens(): Extension {
  return [
    semanticTokensField,
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

/**
 * Apply semantic tokens to a view
 */
export function applySemanticTokens(view: EditorView) {
  view.dispatch({
    effects: [
      // Empty effect since the main functionality is based on updating the server's response
      // in the plugin
    ],
  });
}
