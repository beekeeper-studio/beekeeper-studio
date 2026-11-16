import { getCM, Vim } from "@replit/codemirror-vim";
import { TextEditor } from "../../../lib/components/text-editor/TextEditor";
import { TextEditorConfiguration } from "../../../lib/components/text-editor/types";
import {
  relativeLineNumberLabel,
  setVimLineNumberOption,
} from "../../../lib/components/text-editor/extensions/lineNumbers";
import { VimDirective } from "../../../lib/components/text-editor/extensions/vim";

const FIVE_LINES = "one\ntwo\nthree\nfour\nfive";

function createEditor(config?: Partial<TextEditorConfiguration>) {
  const editor = new TextEditor();
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  editor.initialize({
    initialValue: FIVE_LINES,
    lineNumbers: true,
    ...config,
    parent,
  });
  return editor;
}

function createVimEditor(keymaps: VimDirective[] = []) {
  return createEditor({ keymap: "vim", vimOptions: { keymaps } });
}

function moveCursorToLine(editor: TextEditor, lineNo: number) {
  editor.view.dispatch({
    selection: { anchor: editor.view.state.doc.line(lineNo).from },
  });
}

function gutterLabels(editor: TextEditor): string[] {
  return Array.from(
    editor.view.dom.querySelectorAll(".cm-lineNumbers .cm-gutterElement")
  )
    // The first element is the invisible width spacer.
    .filter((el) => (el as HTMLElement).style.visibility !== "hidden")
    .map((el) => el.textContent);
}

function ex(editor: TextEditor, command: string) {
  Vim.handleEx(getCM(editor.view), command);
}

afterEach(() => {
  // An unchanged vimrc isn't re-applied, so clear it or the next test's
  // identical vimrc would be skipped after the reset below.
  createVimEditor([]);
  setVimLineNumberOption("number", true);
  setVimLineNumberOption("relativenumber", false);
  document.body.innerHTML = "";
});

describe("relativeLineNumberLabel", () => {
  it("shows the distance from the cursor line", () => {
    expect(relativeLineNumberLabel(1, 3, false)).toBe("2");
    expect(relativeLineNumberLabel(5, 3, false)).toBe("2");
  });

  it("shows 0 on the cursor line", () => {
    expect(relativeLineNumberLabel(3, 3, false)).toBe("0");
  });

  it("shows the absolute number on the cursor line in hybrid mode", () => {
    expect(relativeLineNumberLabel(3, 3, true)).toBe("3");
  });
});

describe("relative line numbers", () => {
  it("shows absolute numbers by default", () => {
    const editor = createVimEditor();
    moveCursorToLine(editor, 3);
    expect(gutterLabels(editor)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("shows hybrid numbers with set relativenumber from the vimrc", () => {
    const editor = createVimEditor([{ type: "set", name: "relativenumber", value: true }]);
    moveCursorToLine(editor, 3);
    expect(gutterLabels(editor)).toEqual(["2", "1", "3", "1", "2"]);
  });

  it("shows 0 on the cursor line with set nonumber", () => {
    const editor = createVimEditor([
      { type: "set", name: "nu", value: false },
      { type: "set", name: "rnu", value: true },
    ]);
    moveCursorToLine(editor, 3);
    expect(gutterLabels(editor)).toEqual(["2", "1", "0", "1", "2"]);
  });

  it("follows the cursor", () => {
    const editor = createVimEditor([{ type: "set", name: "rnu", value: true }]);
    moveCursorToLine(editor, 1);
    expect(gutterLabels(editor)).toEqual(["1", "1", "2", "3", "4"]);
    moveCursorToLine(editor, 5);
    expect(gutterLabels(editor)).toEqual(["4", "3", "2", "1", "5"]);
  });

  it("toggles with :set rnu and :set nornu", () => {
    const editor = createVimEditor();
    moveCursorToLine(editor, 2);

    ex(editor, "set rnu");
    expect(gutterLabels(editor)).toEqual(["1", "2", "1", "2", "3"]);

    ex(editor, "set nornu");
    expect(gutterLabels(editor)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it.each([
    ["set relativenumber", "set norelativenumber"],
    ["set rnu", "set nornu"],
    ["set rnu!", "set relativenumber!"],
  ])("toggles with :%s and :%s", (on, off) => {
    const editor = createVimEditor();
    moveCursorToLine(editor, 2);

    ex(editor, on);
    expect(gutterLabels(editor)).toEqual(["1", "2", "1", "2", "3"]);

    ex(editor, off);
    expect(gutterLabels(editor)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("reports the value with :set rnu?", () => {
    const editor = createVimEditor();
    const cm = getCM(editor.view);

    // codemirror-vim echoes the name as typed, where neovim expands it.
    ex(editor, "set rnu?");
    expect(editor.view.dom.textContent).toContain("nornu");

    ex(editor, "set relativenumber");
    expect(Vim.getOption("rnu", cm)).toBe(true);
    expect(Vim.getOption("relativenumber", cm)).toBe(true);
  });

  it("applies :setlocal to that editor only", () => {
    const editor = createVimEditor();
    const other = createVimEditor();
    moveCursorToLine(editor, 2);
    moveCursorToLine(other, 2);

    ex(editor, "setlocal rnu");
    expect(gutterLabels(editor)).toEqual(["1", "2", "1", "2", "3"]);
    expect(gutterLabels(other)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("carries :set over to editors created afterwards", () => {
    const editor = createVimEditor();
    ex(editor, "set rnu");

    const later = createVimEditor();
    moveCursorToLine(later, 2);
    expect(gutterLabels(later)).toEqual(["1", "2", "1", "2", "3"]);
  });

  it("goes back to absolute numbers when leaving vim mode", () => {
    const editor = createVimEditor([{ type: "set", name: "rnu", value: true }]);
    moveCursorToLine(editor, 3);

    editor.setKeymap("default");
    expect(gutterLabels(editor)).toEqual(["1", "2", "3", "4", "5"]);

    editor.setKeymap("vim", { keymaps: [{ type: "set", name: "rnu", value: true }] });
    expect(gutterLabels(editor)).toEqual(["2", "1", "3", "1", "2"]);
  });

  it("picks up a vimrc that loads after the editor was created", () => {
    const editor = createVimEditor();
    moveCursorToLine(editor, 3);

    editor.setKeymap("vim", { keymaps: [{ type: "set", name: "rnu", value: true }] });
    expect(gutterLabels(editor)).toEqual(["2", "1", "3", "1", "2"]);
  });

  it("stays hidden when line numbers are off", () => {
    const editor = createVimEditor([{ type: "set", name: "rnu", value: true }]);
    editor.setLineNumbers(false);
    expect(gutterLabels(editor)).toEqual([]);

    editor.setLineNumbers(true);
    moveCursorToLine(editor, 3);
    expect(gutterLabels(editor)).toEqual(["2", "1", "3", "1", "2"]);
  });

  it("ignores relativenumber outside vim mode", () => {
    setVimLineNumberOption("relativenumber", true);
    const editor = createEditor({ keymap: "default" });
    moveCursorToLine(editor, 3);
    expect(gutterLabels(editor)).toEqual(["1", "2", "3", "4", "5"]);
  });
});
