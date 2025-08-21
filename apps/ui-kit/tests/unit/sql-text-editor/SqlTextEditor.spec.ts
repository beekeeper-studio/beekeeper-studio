import { EditorSelection } from "@codemirror/state";
import { SqlTextEditor } from "../../../lib/components/sql-text-editor/SqlTextEditor";
import { TextEditor } from "../../../lib/components/text-editor/TextEditor";
import { TextEditorConfiguration } from "../../../lib/components/text-editor/types";
import { setClipboard } from "../../../lib/utils";

function createEditor(config?: Partial<TextEditorConfiguration>) {
  const editor = new SqlTextEditor();
  const parent = document.createElement("div");
  editor.initialize({
    ...config,
    parent,
  });
  return editor;
}

function simulatePaste(editor: TextEditor, text: string) {
  const clipboardData = new DataTransfer();
  clipboardData.setData("text/plain", text);

  const event = new ClipboardEvent("paste", {
    clipboardData,
    bubbles: true,
    cancelable: true,
  });

  editor.view.contentDOM.dispatchEvent(event);
}

beforeAll(() => {
  setClipboard(
    new (class extends EventTarget implements Clipboard {
      async writeText(_text: string) {
        // do nothing
      }
      async readText() {
        return "";
      }
      async read(): Promise<ClipboardItem[]> {
        return [];
      }
      async write(_items: ClipboardItem[]) {
        // do nothing
      }
    })()
  );
});

describe("Regressions", () => {
  it("should allow pasting multi-line SQL queries using Ctrl+V in the query editor (Windows) - #3418", async () => {
    const editor = createEditor();
    const multilineSQLWithCarriageReturns = `SELECT * FROM users;\r\nWHERE active = true;\r\nORDER BY created_at DESC;`;
    const multiLineSQLWithoutCarriageReturns = `SELECT * FROM users;\nWHERE active = true;\nORDER BY created_at DESC;`;

    simulatePaste(editor, multilineSQLWithCarriageReturns);

    expect(editor.getValue()).toBe(multiLineSQLWithoutCarriageReturns);
  });

  it("should paste text on all cursor positions (multi-cursor paste)", async () => {
    const editor = createEditor({
      initialValue: `SELECT \nSELECT \nSELECT \n`,
    });

    editor.view.dispatch({
      selection: EditorSelection.create([
        EditorSelection.cursor(7), // End of line 1
        EditorSelection.cursor(15), // End of line 2
        EditorSelection.cursor(23), // End of line 3
      ]),
    });

    simulatePaste(editor, "id");

    expect(editor.getValue()).toBe(`SELECT id\nSELECT id\nSELECT id\n`);
  });
});
