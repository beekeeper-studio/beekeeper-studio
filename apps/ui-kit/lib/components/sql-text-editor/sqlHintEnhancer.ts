import CodeMirror from "codemirror";
import _ from "lodash";

// Track whether the enhancer has been registered globally
let enhancerRegistered = false;

/**
 * Helper function to check if cursor is after SELECT or WHERE keywords
 */
function isAfterSelectOrWhere(editor: CodeMirror.Editor) {
  const cursor = editor.getCursor();
  const lineUntilCursor = editor.getLine(cursor.line).substring(0, cursor.ch);

  // Check if we're after SELECT or WHERE keywords
  const selectWhereRegex = /\b(SELECT|WHERE)\s+[\w\d_."]*$/i;
  return selectWhereRegex.test(lineUntilCursor);
}

/**
 * Gets table name from FROM clause in the current query context
 */
function getTableFromContext(editor: CodeMirror.Editor, cursor: CodeMirror.Position) {
  const line = editor.getLine(cursor.line);
  const fromMatch = /\bFROM\s+([a-zA-Z0-9_."]+)/i.exec(line);

  if (fromMatch && fromMatch[1]) {
    return fromMatch[1].replace(/["'`]/g, '');
  }

  // If not found on current line, search a few lines back
  for (let i = cursor.line - 1; i >= Math.max(0, cursor.line - 5); i--) {
    const prevLine = editor.getLine(i);
    const prevFromMatch = /\bFROM\s+([a-zA-Z0-9_."]+)/i.exec(prevLine);

    if (prevFromMatch && prevFromMatch[1]) {
      return prevFromMatch[1].replace(/["'`]/g, '');
    }
  }

  return null;
}

/**
 * Find column data for a specific table from editor options
 */
async function findColumnsForTable(editor: CodeMirror.Editor, tableName: string) {
  if (!tableName) return null;

  const hintOptions = editor.getOption('hintOptions') || {};
  const tables = hintOptions.tables || {};

  let columns = editor.options.getColumns ? await editor.options.getColumns(tableName): tables[tableName];

  if (columns && columns.columns) {
    columns = columns.columns;
  }

  return columns || []
}

/**
 * Create a column completion item with proper className
 */
function createColumnCompletion(column: string, tableName?: string) {
  const text = tableName ? `${tableName}.${column}` : column;
  return {
    text,
    displayText: column,
    className: "CodeMirror-hint-table"
  };
}

/**
 * Modify SQL completions to enhance results with prioritized columns
 */
async function modifyCompletionsHook(completionResult: any, editor: CodeMirror.Editor, cur: CodeMirror.Position, token: any) {
  if (!completionResult || !completionResult.list) {
    return completionResult;
  }

  // Check if cursor is after SELECT or WHERE
  if (isAfterSelectOrWhere(editor)) {
    const cursor = editor.getCursor();
    const tableName = getTableFromContext(editor, cursor);

    if (tableName) {
      // Look for columns for this table
      const columns = await findColumnsForTable(editor, tableName);

      if (columns) {
        // Get current search term
        const searchText = token.string;

        // Add columns to completions if they match search
        const existingTexts = new Set(completionResult.list.map(item => item.text));

        columns.forEach(column => {
          // Column might be an object or string depending on how data is structured
          const columnName = typeof column === 'string' ? column : column.text || column.name;

          // Skip if invalid or already in list
          if (
            !columnName ||
            existingTexts.has(columnName) ||
            existingTexts.has(`${tableName}.${columnName}`)
          ) {
            return;
          }

          // Add column to completions
          completionResult.list.push(createColumnCompletion(columnName, tableName));
        });

        // Prioritize columns in results
        const columnItems = completionResult.list.filter(item =>
          item.className && item.className.includes("CodeMirror-hint-table")
        );

        const keywordItems = completionResult.list.filter(item =>
          item.className && item.className.includes("CodeMirror-hint-keyword")
        );

        const otherItems = completionResult.list.filter(item =>
          !item.className || (
            !item.className.includes("CodeMirror-hint-table") &&
            !item.className.includes("CodeMirror-hint-keyword")
          )
        );

        // Rebuild completions list with columns first
        completionResult.list.length = 0;
        columnItems.forEach(col => completionResult.list.push(col));
        otherItems.forEach(other => completionResult.list.push(other));
        keywordItems.forEach(kw => completionResult.list.push(kw));
      }
    }
  }

  return completionResult;
}

/**
 * Register SQL hint enhancer plugin
 *
 * This function registers the enhancer only once globally, and then
 * maintains a no-op for each editor instance
 */
function registerSqlHintEnhancer(instance: CodeMirror.Editor) {
  // Check if hooks are available
  if (!CodeMirror.sqlHintHooks || !CodeMirror.registerSqlHintHook) {
    console.error("SQL hint hooks not available");
    return;
  }

  // Register our modifier hook to enhance completions only once globally
  if (!enhancerRegistered) {
    CodeMirror.registerSqlHintHook("modifyCompletions", modifyCompletionsHook);
    enhancerRegistered = true;
  }

  // Return a no-op cleanup function for the specific editor instance
  return () => {
    // We intentionally don't unregister the global hook when an individual editor is destroyed
    // as other editors might still be using it. The global hook will remain registered.
  };
}

export const sqlHintEnhancer = registerSqlHintEnhancer;
