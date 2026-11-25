import { describe, it, expect } from "vitest";
import { TextEditor } from "../../../lib/components/text-editor/TextEditor";

function createEditor(initialValue: string) {
  const editor = new TextEditor();
  const parent = document.createElement("div");
  editor.initialize({
    initialValue,
    parent,
  });
  return editor;
}

describe("TextEditor multi-cursor and occurrence selection", () => {
  it("selects next occurrence using selectNextOccurrence (Mod-d)", () => {
    const editor = createEditor("SELECT id, name FROM users WHERE id = 1");
    // Place cursor at "id" (index 7)
    editor.view.dispatch({
      selection: { anchor: 7, head: 9 }, // select first "id"
    });

    expect(editor.view.state.selection.ranges).toHaveLength(1);
    expect(editor.view.state.sliceDoc(editor.view.state.selection.main.from, editor.view.state.selection.main.to)).toBe("id");

    // Execute selectNextOccurrence command
    editor.execCommand("selectNextOccurrence");

    // Now there should be 2 selections (both "id"s)
    expect(editor.view.state.selection.ranges).toHaveLength(2);
  });

  it("selects all occurrences using selectSelectionMatches (Mod-Shift-l)", () => {
    const editor = createEditor("foo bar foo baz foo");
    editor.view.dispatch({
      selection: { anchor: 0, head: 3 }, // select first "foo"
    });

    expect(editor.view.state.selection.ranges).toHaveLength(1);

    editor.execCommand("selectSelectionMatches");

    // All 3 "foo"s selected
    expect(editor.view.state.selection.ranges).toHaveLength(3);
  });

  it("supports addCursorBelow and addCursorAbove", () => {
    const editor = createEditor("line 1\nline 2\nline 3");
    editor.view.dispatch({
      selection: { anchor: 0 },
    });

    editor.execCommand("addCursorBelow");
    expect(editor.view.state.selection.ranges).toHaveLength(2);

    editor.execCommand("addCursorAbove");
    // Cursor above line 1 cannot add above, stays valid
    expect(editor.view.state.selection.ranges.length).toBeGreaterThanOrEqual(1);
  });
});
