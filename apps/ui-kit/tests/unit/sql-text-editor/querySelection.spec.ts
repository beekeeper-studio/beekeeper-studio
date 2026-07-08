import { EditorSelection } from "@codemirror/state";
import { SqlTextEditor } from "../../../lib/components/sql-text-editor/SqlTextEditor";
import { vi } from "vitest";
import * as sqlQueryIdentifier from "sql-query-identifier";

// Wrap identify so individual tests can force it to throw via mockImplementationOnce
vi.mock("sql-query-identifier", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof sqlQueryIdentifier;
  return {
    ...actual,
    identify: vi.fn(actual.identify),
  };
});

function initializeEditor(editor: SqlTextEditor, initialValue?: string) {
  const parent = document.createElement("div");
  editor.initialize({ parent, initialValue });
  return editor;
}

describe("querySelection", () => {
  it("should call onQuerySelectionChange when clicking into a query", () => {
    const onQuerySelectionChange = vi.fn();
    const editor = initializeEditor(
      new SqlTextEditor({ onQuerySelectionChange }),
      "SELECT 1"
    );

    // Simulate clicking into the query (cursor move)
    editor.view.dispatch({
      selection: EditorSelection.cursor(3),
    });

    expect(onQuerySelectionChange).toHaveBeenCalledTimes(1);
    expect(onQuerySelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedQuery: expect.objectContaining({ text: "SELECT 1" }),
      })
    );

    editor.destroy();
  });

  it("should call onQuerySelectionChange when cursor moves to a different query", () => {
    const onQuerySelectionChange = vi.fn();
    const editor = initializeEditor(
      new SqlTextEditor({ onQuerySelectionChange }),
      "SELECT 1;\nSELECT 2"
    );

    // Move cursor to second query
    editor.view.dispatch({
      selection: EditorSelection.cursor(15),
    });

    expect(onQuerySelectionChange).toHaveBeenCalledTimes(1);
    expect(onQuerySelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedQuery: expect.objectContaining({ text: "SELECT 2" }),
      })
    );

    editor.destroy();
  });

  it("should call onQuerySelectionChange on first click into a single query", () => {
    const onQuerySelectionChange = vi.fn();
    // Start with empty editor
    const editor = initializeEditor(
      new SqlTextEditor({ onQuerySelectionChange })
    );

    expect(onQuerySelectionChange).not.toHaveBeenCalled();

    // Simulate typing a query (set value)
    editor.view.dispatch({
      changes: { from: 0, insert: "SELECT 1" },
    });

    expect(onQuerySelectionChange).toHaveBeenCalledTimes(1);
    expect(onQuerySelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedQuery: expect.objectContaining({ text: "SELECT 1" }),
      })
    );

    onQuerySelectionChange.mockClear();

    // Click within the same query (move cursor)
    editor.view.dispatch({
      selection: EditorSelection.cursor(3),
    });

    // Same query selected - no change, no callback
    expect(onQuerySelectionChange).not.toHaveBeenCalled();

    editor.destroy();
  });

  it("should report all queries in the callback", () => {
    const onQuerySelectionChange = vi.fn();
    const editor = initializeEditor(
      new SqlTextEditor({ onQuerySelectionChange }),
      "SELECT 1;\nSELECT 2;\nSELECT 3"
    );

    // Trigger a selection change to fire the callback
    editor.view.dispatch({
      selection: EditorSelection.cursor(0),
    });

    expect(onQuerySelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        queries: expect.arrayContaining([
          expect.objectContaining({ text: "SELECT 1;" }),
          expect.objectContaining({ text: "SELECT 2;" }),
          expect.objectContaining({ text: "SELECT 3" }),
        ]),
      })
    );

    editor.destroy();
  });

  it("should detect parameters on the first callback for a freshly loaded query", () => {
    const onQuerySelectionChange = vi.fn();
    // Editor loaded with an existing (saved) query containing a named param, and paramTypes
    // supplied at construction — mirrors loading a saved query then running it without editing.
    const editor = initializeEditor(
      new SqlTextEditor({ onQuerySelectionChange, paramTypes: { named: [":"] } }),
      "SELECT * FROM users WHERE id = :id"
    );

    // First interaction (e.g. clicking Run/moving the cursor) fires the callback. The params
    // must already be identified here — previously paramTypes lagged one transaction behind,
    // so this first callback reported no parameters until the query was edited.
    editor.view.dispatch({
      selection: EditorSelection.cursor(0),
    });

    expect(onQuerySelectionChange).toHaveBeenCalled();
    const params = onQuerySelectionChange.mock.calls[0][0];
    expect(params.selectedQuery.parameters).toContain(":id");

    editor.destroy();
  });

  it("should fall back to a single whole-text query and report the error when identify throws", () => {
    const onQuerySelectionChange = vi.fn();
    const editor = initializeEditor(
      new SqlTextEditor({ onQuerySelectionChange }),
      "SELECT 1"
    );

    const error = new Error("parse failure");
    vi.mocked(sqlQueryIdentifier.identify).mockImplementationOnce(() => {
      throw error;
    });

    // Trigger a re-parse, which now throws and hits the fallback
    editor.view.dispatch({
      changes: { from: 8, insert: " WHERE" },
    });

    expect(onQuerySelectionChange).toHaveBeenCalledTimes(1);
    const params = onQuerySelectionChange.mock.calls[0][0];
    expect(params.error).toBe(error);
    expect(params.queries).toHaveLength(1);
    expect(params.queries[0].text).toBe("SELECT 1 WHERE");
    expect(params.selectedQuery.text).toBe("SELECT 1 WHERE");

    editor.destroy();
  });
});
