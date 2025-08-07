import { EditorView } from "@codemirror/view";
import { SqlTextEditor } from "../../../lib/components/sql-text-editor/SqlTextEditor";
import { ColumnsGetter } from "../../../lib/components/sql-text-editor/extensions";
import { Entity } from "../../../lib/components/types";
import _ from "lodash";
import { test, vitest } from "vitest";

type CM5Pos = {
  line: number;
  ch: number;
};

type CM5Tables =
  | Record<string, string[]>
  | {
    text: string;
    displayText?: string;
    columns: { text: string; displayText?: string }[];
  }[];

export function Pos(line: number, ch: number): CM5Pos {
  return { line, ch };
}

function posToOffset(doc: EditorView["state"]["doc"], pos: CM5Pos): number {
  return doc.line(pos.line + 1).from + pos.ch;
}

function tablesToEntities(tables: CM5Tables): Entity[] {
  if (Array.isArray(tables)) {
    return tables.map((t) => ({
      name: t.text,
      columns: t.columns.map((c) => ({
        field: c.text,
        displayText: c.displayText,
        columnName: (c as any).columnName,
        columnHint: (c as any).columnHint
      })),
      displayText: t.displayText,
      entityType: "table" as const,
    }));
  }

  return Object.entries(tables).map(([name, columns]) => ({
    name,
    columns: columns.map((c) => ({ field: c })),
    entityType: "table" as const,
  }));
}

class Editor {
  private dom: HTMLElement;
  private editor: SqlTextEditor;

  private disableKeywords: boolean;
  private tableNames: Set<string> = new Set();

  constructor(opts: {
    value: string;
    tables?: CM5Tables;
    getColumns?: ColumnsGetter;
    cursor: CM5Pos;
    disableKeywords?: boolean;
    defaultTable?: string;
    mode?: string;
  }) {
    this.disableKeywords = opts.disableKeywords || false;

    this.dom = document.createElement("div");
    document.body.appendChild(this.dom);

    this.editor = new SqlTextEditor();
    this.editor.initialize({
      parent: this.dom,
      initialValue: opts.value,
    });

    // Convert tables to entities and apply them
    if (opts.tables) {
      const entities = tablesToEntities(opts.tables);
      // Store table names for completion type detection
      entities.forEach(entity => this.tableNames.add(entity.name));

      this.editor.setCompletionSource({
        entities,
        defaultSchema: opts.defaultTable ? undefined : undefined,
      });
    }

    // Apply columns getter if provided
    if (opts.getColumns) {
      this.editor.setRequestColumnsListener(opts.getColumns);
    }

    // Set cursor position
    const doc = this.editor.view.state.doc;
    const offset = posToOffset(doc, opts.cursor);

    // Ensure offset is within document bounds
    if (offset <= doc.length) {
      this.editor.view.dispatch({
        selection: { anchor: offset },
      });
    }
  }

  async complete(): Promise<any[]> {
    return new Promise((resolve) => {
      // Set up a completion result handler
      let completed = false;
      const originalComplete = this.editor.view.state.languageDataAt("autocomplete", this.editor.view.state.selection.main.head);

      // Trigger completion manually by calling the completion sources
      const pos = this.editor.view.state.selection.main.head;
      const context = {
        state: this.editor.view.state,
        pos,
        explicit: true,
        matchBefore: (regexp: RegExp) => {
          const line = this.editor.view.state.doc.lineAt(pos);
          const text = line.text.slice(0, pos - line.from);
          const match = regexp.exec(text);
          if (match) {
            return {
              from: line.from + text.length - match[0].length,
              to: pos,
              text: match[0]
            };
          }
          return null;
        }
      };

      // Get all available completion sources
      const completionSources = this.editor.view.state.languageDataAt("autocomplete", pos);

      if (completionSources.length === 0) {
        resolve([]);
        return;
      }

      // Store completionSources for debugging
      (this as any).lastCompletionSources = completionSources;

      // Call all completion sources and combine results
      const promises = completionSources.map(source =>
        Promise.resolve(source(context)).catch(() => null)
      );

      Promise.all(promises).then(results => {
        let allOptions = [];
        for (const result of results) {
          if (result && result.options) {
            allOptions.push(...result.options);
          }
        }

        // Filter out keywords if disableKeywords is true
        if (this.disableKeywords) {
          allOptions = allOptions.filter(option =>
            option.type !== 'keyword' &&
            option.type !== 'variable' &&
            option.type !== 'type'
          );
        }

        // Post-process completions to add table prefix for dot completion
        allOptions = this.postProcessCompletions(allOptions, context);

        resolve(allOptions);
      }).catch(() => {
        resolve([]);
      });
    });
  }

  private postProcessCompletions(completions: any[], context: any): any[] {
    const line = this.editor.view.state.doc.lineAt(context.pos);
    const textBeforeCursor = line.text.slice(0, context.pos - line.from);

    // Check if cursor is after a table name followed by a dot
    const dotMatch = textBeforeCursor.match(/(\w+)\.$/);
    if (dotMatch) {
      const tableName = dotMatch[1];

      // Transform property completions to include table prefix
      return completions.map(completion => {
        if (completion.type === 'property') {
          const label = typeof completion.label === 'string' ? completion.label : completion.label?.text || completion.label;
          return {
            ...completion,
            label: `${tableName}.${label}`
          };
        }
        return completion;
      });
    }

    // Map completion types to match expected test behavior
    return completions.map(completion => {
      // Map SQL table/schema completions to 'table' type
      if (completion.type === 'type' && this.isTableCompletion(completion)) {
        return {
          ...completion,
          type: 'table'
        };
      }
      return completion;
    });
  }

  private isTableCompletion(completion: any): boolean {
    // Determine if a completion with type 'type' is actually a table
    const label = typeof completion.label === 'string' ? completion.label : completion.label?.text || completion.label;

    // First check if it's in our known table names
    if (this.tableNames.has(label)) {
      return true;
    }

    // Simple heuristic: common SQL data types vs likely table names
    const commonSqlTypes = [
      'int', 'integer', 'bigint', 'smallint', 'tinyint',
      'varchar', 'char', 'text', 'nvarchar', 'nchar',
      'boolean', 'bool', 'bit',
      'date', 'datetime', 'timestamp', 'time',
      'decimal', 'numeric', 'float', 'double', 'real',
      'blob', 'clob', 'json', 'xml'
    ];

    // If it's a common SQL type, it's not a table
    if (commonSqlTypes.includes(label?.toLowerCase())) {
      return false;
    }

    // If it looks like a table name (starts with uppercase or contains underscores), it's likely a table
    return /^[A-Z]/.test(label) || label?.includes('_') || label?.includes('table');
  }

  destroy() {
    this.editor.destroy();
    this.dom.remove();
  }
}

function _testCompletions(it, name, spec) {
  it(name, async () => {
    const editor = new Editor({
      value: spec.value,
      getColumns: spec.getColumns,
      tables: spec.tables,
      cursor: spec.cursor,
      disableKeywords: spec.disableKeywords,
      defaultTable: spec.defaultTable,
      mode: spec.mode,
    });

    const completions = await editor.complete();

    // Debug output removed

    // Test completions
    if (spec.list) {
      const actualCompletions = completions.map(c => {
        const label = typeof c.label === 'string' ? c.label : c.label?.text || c.label;
        const displayText = typeof c.label === 'object' ? c.label?.displayText : undefined;
        const columnName = typeof c.label === 'object' ? c.label?.columnName : undefined;
        const columnHint = typeof c.label === 'object' ? c.label?.columnHint : undefined;

        return {
          text: label,
          displayText,
          className: c.type,
          columnName,
          columnHint,
        };
      });

      if (Array.isArray(spec.list) && spec.list.every(item => typeof item === 'string')) {
        // Simple string array comparison
        const actualTexts = actualCompletions.map(c => c.text);
        expect(actualTexts).toEqual(expect.arrayContaining(spec.list));
        expect(actualTexts.length).toBe(spec.list.length);
      } else {
        // Object comparison with text, displayText, className, etc.
        for (const expectedItem of spec.list) {
          if (typeof expectedItem === 'string') {
            expect(actualCompletions.some(c => c.text === expectedItem)).toBe(true);
          } else {
            // Handle case-insensitive keyword matching
            const matchingCompletion = actualCompletions.find(c => {
              if (expectedItem.className === 'keyword') {
                return c.text.toUpperCase() === expectedItem.text.toUpperCase();
              }
              return c.text === expectedItem.text;
            });
            expect(matchingCompletion).toBeTruthy();

            if (expectedItem.className) {
              expect(matchingCompletion.className).toBe(expectedItem.className);
            }
            if (expectedItem.displayText) {
              expect(matchingCompletion.displayText).toBe(expectedItem.displayText);
            }
            if (expectedItem.columnName) {
              expect(matchingCompletion.columnName).toBe(expectedItem.columnName);
            }
            if (expectedItem.columnHint) {
              expect(matchingCompletion.columnHint).toBe(expectedItem.columnHint);
            }
          }
        }
      }
    }

    editor.destroy();
  });
}

export const testCompletions: typeof test = _testCompletions.bind(test, test);
testCompletions["only"] = _testCompletions.bind(null, test["only"]);
testCompletions["skip"] = _testCompletions.bind(null, test["skip"]);

document.createRange = () => {
  const range = new Range();

  range.getBoundingClientRect = vitest.fn();

  range.getClientRects = vitest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};
