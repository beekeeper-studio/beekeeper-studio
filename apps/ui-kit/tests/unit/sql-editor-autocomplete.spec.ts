// Test for issue #2884: auto-complete suggestions reappear after pressing Escape
import { expect, it, describe, beforeEach, afterEach, vi } from "vitest";
import CodeMirror from "codemirror";
import { autocompleteHandler } from "../../lib/components/sql-text-editor/plugins";

class TestEditor {
  editor: CodeMirror.Editor;
  textarea: HTMLTextAreaElement;

  constructor(opts = {}) {
    this.textarea = document.createElement("textarea");
    document.body.appendChild(this.textarea);

    // @ts-ignore
    this.editor = {
      state: {},
      getCursor: vi.fn(() => ({ line: 0, ch: 13 })),
      getLine: vi.fn(() => "SELECT FROM users"),
      options: { tables: {} },
    };

    // Mock functions for CodeMirror commands
    // @ts-ignore
    CodeMirror.commands = {
      autocomplete: vi.fn()
    };
  }

  // Simulate Escape key press
  simulateEscapeKey() {
    const event = new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape' });
    autocompleteHandler(this.editor, event);
  }
  
  // Simulate Backspace key press
  simulateBackspaceKey() {
    const event = new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace' });
    autocompleteHandler(this.editor, event);
  }

  destroy() {
    document.body.removeChild(this.textarea);
  }
}

describe("SQL editor autocomplete handler", () => {
  // Mock setTimeout to execute immediately
  let originalSetTimeout: typeof setTimeout;
  
  beforeEach(() => {
    originalSetTimeout = global.setTimeout;
    global.setTimeout = vi.fn((fn) => {
      fn();
      return 0 as any;
    });
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
    vi.resetAllMocks();
  });

  it("should show completions after pressing Escape when completions were active", () => {
    const editor = new TestEditor();
    
    // Set completion as active
    editor.editor.state.completionActive = {};
    
    // Simulate pressing Escape key
    editor.simulateEscapeKey();
    
    // Verify autocomplete was called
    expect(CodeMirror.commands.autocomplete).toHaveBeenCalled();
    
    editor.destroy();
  });

  it("should show completions after pressing Backspace in a FROM context", () => {
    const editor = new TestEditor();
    
    // Simulate backspace key press
    editor.simulateBackspaceKey();
    
    // Verify autocomplete was called
    expect(CodeMirror.commands.autocomplete).toHaveBeenCalled();
    
    editor.destroy();
  });
});