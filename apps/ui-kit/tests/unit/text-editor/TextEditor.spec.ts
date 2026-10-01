import { TextEditor } from "../../../lib/components/text-editor/TextEditor";
import { TextEditorConfiguration } from "../../../lib/components/text-editor/types";

function createEditor(config?: Partial<TextEditorConfiguration>) {
  const editor = new TextEditor();
  const parent = document.createElement("div");
  editor.initialize({
    ...config,
    parent,
  });
  return editor;
}

// Simulate a user edit: a plain dispatch is recorded in the undo history by
// default, the same as typing would be.
function typeAtEnd(editor: TextEditor, text: string) {
  editor.view.dispatch({
    changes: { from: editor.getLength(), insert: text },
  });
}

describe("setValue history behavior", () => {
  it("does not record a programmatic setValue in the undo history", () => {
    const editor = createEditor({ initialValue: "a" });

    editor.setValue("b");
    expect(editor.getValue()).toBe("b");

    // The content load must not be undoable, so undo is a no-op here.
    editor.execCommand("undo");
    expect(editor.getValue()).toBe("b");
  });

  it("still allows undo/redo of actual user edits", () => {
    const editor = createEditor({ initialValue: "a" });

    typeAtEnd(editor, "b");
    expect(editor.getValue()).toBe("ab");

    editor.execCommand("undo");
    expect(editor.getValue()).toBe("a");

    editor.execCommand("redo");
    expect(editor.getValue()).toBe("ab");
  });

  it("does not step back through repeated content loads", () => {
    // Models the JSON viewer, whose `value` prop changes repeatedly as the
    // selected row changes. None of those loads should be undoable.
    const editor = createEditor({ initialValue: "one" });

    editor.setValue("two");
    editor.setValue("three");
    expect(editor.getValue()).toBe("three");

    editor.execCommand("undo");
    expect(editor.getValue()).toBe("three");
  });
});
