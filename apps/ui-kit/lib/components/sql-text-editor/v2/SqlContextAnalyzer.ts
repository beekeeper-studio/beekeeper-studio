import { EditorState, Text } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { Entity } from "../../types";
import getAliases from "./getAliases";

export type ColumnsGetter = (entity: Entity) => string[] | Promise<string[]>

export class SqlContextAnalyzer {
  constructor(private entities: Entity[], private columnsGetter: ColumnsGetter) {
    this.entities = entities;
    this.columnsGetter = columnsGetter;
  }

  setEntities(entities: Entity[]) {
    this.entities = entities;
  }

  setColumnsGetter(columnsGetter: ColumnsGetter) {
    this.columnsGetter = columnsGetter;
  }

  /**
   * Check if cursor is at a position where column completion makes sense
   */
  private isColumnCompletionPosition(textBeforeCursor: string): boolean {
    const completionPatterns = [
      /\bSELECT\s+$/i, // After SELECT
      /\bSELECT.+,\s*$/i, // After comma in SELECT
      /\b(WHERE|AND|OR)\s+$/i, // After WHERE/AND/OR
      /\b(ORDER\s+BY|GROUP\s+BY|HAVING)\s+$/i, // After ORDER BY/GROUP BY/HAVING
      /\bJOIN.+\bON\s+$/i, // After JOIN...ON
    ];

    return completionPatterns.some((pattern) => pattern.test(textBeforeCursor));
  }

  /**
   * Collect all tables from the current SQL context
   */
  private getTablesFromContext(
    state: EditorState,
    doc: Text,
    line: any,
    cursor: number
  ): Set<string> {
    // Get the statement node and any table aliases
    const node = syntaxTree(state).resolveInner(cursor, -1);
    const aliases = getAliases(doc, node);

    // Get nearby context (5 lines before and after)
    const contextStart = Math.max(0, line.number - 5);
    const contextEnd = Math.min(doc.lines, line.number + 5);
    const contextText = this.getContextText(doc, contextStart, contextEnd);

    // Collect tables from different sources
    const tables = new Set<string>();

    // Add tables from aliases
    if (aliases) {
      for (const [_, tablePath] of Object.entries(aliases)) {
        if (tablePath?.length > 0) {
          tables.add(tablePath[0]);
        }
      }
    }

    // Add tables from FROM clauses
    const fromMatches = contextText.match(/\bFROM\s+([a-zA-Z0-9_]+)/gi);
    if (fromMatches) {
      for (const match of fromMatches) {
        tables.add(match.replace(/\bFROM\s+/i, "").trim());
      }
    }

    return tables;
  }

  /**
   * Extract text from multiple lines for context analysis
   */
  getContextText(doc: Text, startLine: number, endLine: number): string {
    let contextText = "";
    for (let i = startLine; i <= endLine; i++) {
      if (i > 0 && i <= doc.lines) {
        contextText += doc.line(i).text + "\n";
      }
    }
    return contextText;
  }

  /**
   * Resolves an identifier to determine if it's a table or alias
   */
  async resolveTableIdentifier(doc: Text, node: any, identifier: string): Promise<string | null> {
    const aliases = getAliases(doc, node);

    // Get table name (either directly or from alias)
    const tableName =
      aliases && identifier in aliases && aliases[identifier].length > 0
        ? aliases[identifier][0]
        : identifier;

    return tableName;
  }

  /**
   * Identify relevant tables from query context at cursor position and load columns
   */
  async loadColumnsFromQueryContext(
    state: EditorState,
    cursor: number
  ): Promise<string[]> {
    const doc = state.doc;
    const line = doc.lineAt(cursor);
    const textBeforeCursor = line.text.substring(0, cursor - line.from);

    if (!this.isColumnCompletionPosition(textBeforeCursor)) {
      return [];
    }

    const tables = this.getTablesFromContext(state, doc, line, cursor);

    // Request columns for all tables and combine results
    const columns = [];
    for (const tableName of tables) {
      columns.push(...(await this.requestColumns(tableName)));
    }
    return columns;
  }

  /**
   * Request columns for a specific table
   */
  private async requestColumns(tableName: string): Promise<string[]> {
    if (!this.columnsGetter) {
      return [];
    }
    const entity = this.entities.find((e) => e.name === tableName);
    if (entity) {
      return await this.columnsGetter(entity);
    }
    return [];
  }

  /**
   * Handle dot completion (e.g., table.column or alias.column)
   */
  async getDotCompletionColumns(
    context: any,
    cursor: number,
    doc: Text
  ): Promise<string[] | null> {
    const line = doc.lineAt(cursor);
    const textBeforeCursor = line.text.substring(0, cursor - line.from);
    const lastDotPos = textBeforeCursor.lastIndexOf(".");

    if (lastDotPos < 0) return null;

    const textBeforeDot = textBeforeCursor.substring(0, lastDotPos);
    const identifierMatch = textBeforeDot.match(/([A-Za-z0-9_]+)$/);
    if (!identifierMatch || !identifierMatch[1]) return null;

    const identifier = identifierMatch[1];
    const node = syntaxTree(context.state).resolveInner(cursor, -1);
    const aliases = getAliases(doc, node);

    // Get table name (either directly or from alias)
    const tableName =
      aliases && identifier in aliases && aliases[identifier].length > 0
        ? aliases[identifier][0]
        : identifier;

    return await this.requestColumns(tableName);
  }
}
