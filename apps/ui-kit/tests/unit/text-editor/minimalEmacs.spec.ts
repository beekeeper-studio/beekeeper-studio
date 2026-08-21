import { EditorSelection } from "@codemirror/state";
import { runScopeHandlers } from "@codemirror/view";
import { TextEditor } from "../../../lib/components/text-editor/TextEditor";
import { minimalEmacsKeybindings } from "../../../lib/components/text-editor/extensions/minimalEmacs";
import { setClipboard } from "../../../lib/utils";

function createEditor(value: string, cursor = 0, keymap = "minimal-emacs") {
  const parent = document.createElement("div");
  document.body.appendChild(parent);

  const editor = new TextEditor();
  editor.initialize({
    parent,
    initialValue: value,
    keymap: keymap as "minimal-emacs" | "default",
    lineNumbers: false,
    // moveToLineBoundary only consults the layout when lines wrap, which
    // happy-dom cannot measure.
    lineWrapping: false,
  });
  editor.view.dispatch({ selection: EditorSelection.cursor(cursor) });

  return editor;
}

type Mods = { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean };

function press(editor: TextEditor, key: string, mods: Mods = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...mods,
  });
  // Browsers report the unshifted physical key here, and codemirror needs it to
  // resolve a shifted binding: with Shift held `key` is already "E", and only
  // keyCode still says which key was pressed.
  Object.defineProperty(event, "keyCode", {
    value: key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0,
  });

  const stopPropagation = vi.spyOn(event, "stopPropagation");
  const handled = runScopeHandlers(editor.view, event, "editor");
  return { handled, stopped: stopPropagation.mock.calls.length > 0 };
}

const ctrl = (editor: TextEditor, key: string, mods: Mods = {}) =>
  press(editor, key, { ctrlKey: true, ...mods });
const alt = (editor: TextEditor, key: string, mods: Mods = {}) =>
  press(editor, key, { altKey: true, ...mods });

const cursor = (editor: TextEditor) => editor.view.state.selection.main.head;

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

afterEach(() => {
  document.body.innerHTML = "";
});

describe("minimal emacs keymap", () => {
  describe("motion", () => {
    it("moves by character with Ctrl-b and Ctrl-f", () => {
      const editor = createEditor("select one", 5);
      ctrl(editor, "b");
      expect(cursor(editor)).toBe(4);
      ctrl(editor, "f");
      ctrl(editor, "f");
      expect(cursor(editor)).toBe(6);
    });

    it("moves by line with Ctrl-p and Ctrl-n", () => {
      // Vertical motion asks codemirror for line geometry, which happy-dom
      // cannot measure, so only the direction is meaningful here.
      const editor = createEditor("aaaa\nbbbb\ncccc", 0);
      expect(ctrl(editor, "n").handled).toBe(true);
      const down = cursor(editor);
      expect(down).toBeGreaterThan(0);

      expect(ctrl(editor, "p").handled).toBe(true);
      expect(cursor(editor)).toBeLessThan(down);
    });

    it("moves to the line boundaries with Ctrl-a and Ctrl-e", () => {
      const editor = createEditor("select one\nselect two", 15);
      ctrl(editor, "a");
      expect(cursor(editor)).toBe(11);
      ctrl(editor, "e");
      expect(cursor(editor)).toBe(21);
    });

    it("moves by word with Alt-b and Alt-f", () => {
      const editor = createEditor("select one two", 0);
      alt(editor, "f");
      expect(cursor(editor)).toBe(6);
      alt(editor, "f");
      expect(cursor(editor)).toBe(10);
      alt(editor, "b");
      expect(cursor(editor)).toBe(7);
    });

    it("extends the selection when shift is held", () => {
      const editor = createEditor("select one", 0);
      // Shift+Ctrl+E arrives with key already uppercased, the way a browser
      // sends it.
      ctrl(editor, "E", { shiftKey: true });
      expect(editor.view.state.selection.main).toMatchObject({ from: 0, to: 10 });
    });
  });

  describe("deletion", () => {
    it("deletes a character forward with Ctrl-d and backward with Ctrl-h", () => {
      const editor = createEditor("abcd", 2);
      ctrl(editor, "d");
      expect(editor.getValue()).toBe("abd");
      ctrl(editor, "h");
      expect(editor.getValue()).toBe("ad");
    });

    it("deletes a word forward with Alt-d and backward with Alt-Backspace", () => {
      const editor = createEditor("select one two", 7);
      alt(editor, "d");
      expect(editor.getValue()).toBe("select  two");
      alt(editor, "Backspace");
      expect(editor.getValue()).toBe(" two");
    });
  });

  describe("kill ring", () => {
    it("round trips through Ctrl-k and Ctrl-y", () => {
      const editor = createEditor("select one\nselect two", 7);
      ctrl(editor, "k");
      expect(editor.getValue()).toBe("select \nselect two");

      editor.view.dispatch({ selection: EditorSelection.cursor(editor.getLength()) });
      ctrl(editor, "y");
      expect(editor.getValue()).toBe("select \nselect twoone");
    });

    it("takes the line break when there is nothing left on the line", () => {
      const editor = createEditor("aaa\nbbb", 3);
      ctrl(editor, "k");
      expect(editor.getValue()).toBe("aaabbb");
    });

    it("kills to the start of the line with Ctrl-u", () => {
      const editor = createEditor("select one", 7);
      ctrl(editor, "u");
      expect(editor.getValue()).toBe("one");
    });

    it("accumulates consecutive kills into one entry", () => {
      const editor = createEditor("one two three", 0);
      alt(editor, "d");
      alt(editor, "d");
      expect(editor.getValue()).toBe(" three");

      editor.view.dispatch({ selection: EditorSelection.cursor(editor.getLength()) });
      ctrl(editor, "y");
      expect(editor.getValue()).toBe(" threeone two");
    });

    it("starts a new entry when something happens between two kills", () => {
      const editor = createEditor("aaa\nbbb", 0);
      ctrl(editor, "k");
      ctrl(editor, "f");
      ctrl(editor, "k");

      editor.view.dispatch({ selection: EditorSelection.cursor(editor.getLength()) });
      ctrl(editor, "y");
      // The second kill only, not "aaa" glued onto it.
      expect(editor.getValue()).toBe("\nbbb");
    });

    it("cuts the selection with Ctrl-w and copies it with Alt-w", () => {
      const editor = createEditor("select one", 0);
      editor.view.dispatch({ selection: EditorSelection.range(0, 6) });
      ctrl(editor, "w");
      expect(editor.getValue()).toBe(" one");

      const copied = createEditor("keep me", 0);
      copied.view.dispatch({ selection: EditorSelection.range(0, 4) });
      alt(copied, "w");
      expect(copied.getValue()).toBe("keep me");
    });

    it("falls back to killing a word when Ctrl-w has no selection", () => {
      const editor = createEditor("select one", 10);
      ctrl(editor, "w");
      expect(editor.getValue()).toBe("select ");
    });

    it("still claims Ctrl-y when the ring is empty", () => {
      const editor = createEditor("select one", 0);
      const result = ctrl(editor, "y");
      expect(result.handled).toBe(true);
      expect(editor.getValue()).toBe("select one");
    });
  });

  describe("winning over the app's own shortcuts", () => {
    it("claims Ctrl-a rather than falling through to select all", () => {
      const editor = createEditor("select one", 4);
      ctrl(editor, "a");
      expect(cursor(editor)).toBe(0);

      // A second press has nowhere to go. Without the claim, codemirror would
      // try the next command bound to the key, which is select all.
      ctrl(editor, "a");
      expect(editor.view.state.selection.main.empty).toBe(true);
    });

    it("stops propagation so document level hotkeys never see the key", () => {
      const editor = createEditor("aaaa\nbbbb", 0);
      expect(ctrl(editor, "n")).toEqual({ handled: true, stopped: true });
      expect(ctrl(editor, "p")).toEqual({ handled: true, stopped: true });
      expect(ctrl(editor, "k")).toEqual({ handled: true, stopped: true });
    });

    it("sets preventDefault and stopPropagation on every binding", () => {
      for (const binding of minimalEmacsKeybindings) {
        expect(binding.preventDefault, binding.key ?? binding.mac).toBe(true);
        expect(binding.stopPropagation, binding.key ?? binding.mac).toBe(true);
      }
    });
  });

  describe("platform gating", () => {
    // Codemirror reads the platform once at module load, and happy-dom never
    // reports a mac, so these can only be checked declaratively.
    it.each(["Ctrl-o", "Ctrl-t", "Ctrl-v", "Ctrl-l"])(
      "leaves %s to the OS everywhere but macOS",
      (key) => {
        const binding = minimalEmacsKeybindings.find((b) => b.mac === key);
        expect(binding).toBeDefined();
        expect(binding.key).toBeUndefined();
      }
    );

    it("does not bind Ctrl-v off mac, so paste still works", () => {
      const editor = createEditor("select one", 0);
      expect(ctrl(editor, "v").handled).toBe(false);
    });
  });

  describe("staying opt in", () => {
    it("leaves the keys alone on the default keymap", () => {
      const editor = createEditor("select one\nselect two", 7, "default");
      ctrl(editor, "k");
      expect(editor.getValue()).toBe("select one\nselect two");
    });
  });
});
