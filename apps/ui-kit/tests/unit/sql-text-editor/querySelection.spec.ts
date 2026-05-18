import { EditorSelection } from "@codemirror/state";
import { SqlTextEditor } from "../../../lib/components/sql-text-editor/SqlTextEditor";
import { vi } from "vitest";

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

    onQuerySelectionChange.mockClear();

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
});
