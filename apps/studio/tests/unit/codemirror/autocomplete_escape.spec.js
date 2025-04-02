// Test for issue #2884: auto-complete suggestions reappear after pressing Escape
import { jest } from '@jest/globals';
import CodeMirror from "codemirror";
import { Pos } from "codemirror";
import "@/vendor/sql-hint/index";
import "@/vendor/show-hint/index";
import "../../../src/lib/editor/CodeMirrorDefinitions";
import {
  autocompleteHandler,
  registerAutoComplete
} from "../../../src/lib/editor/CodeMirrorPlugins";

class TestEditor {
  constructor(opts = {}) {
    this.textarea = document.createElement("textarea");
    document.body.appendChild(this.textarea);

    this.cm = CodeMirror.fromTextArea(this.textarea, {
      ...opts,
      mode: opts.mode || "text/x-mysql",
    });

    this.cm.setValue(opts.value || "");
    
    // Initialize with tables
    this.cm.options.tables = opts.tables || {};
    this.cm.options.defaultTable = opts.defaultTable;
    this.cm.options.disableKeywords = opts.disableKeywords;
    
    // Register auto-complete handler
    this.unregisterAutoComplete = registerAutoComplete(this.cm);
  }

  async hint() {
    return await CodeMirror.hint.sql(this.cm, {
      tables: this.cm.options.tables,
      defaultTable: this.cm.options.defaultTable,
      disableKeywords: this.cm.options.disableKeywords,
    });
  }

  // Simulate Escape key press
  simulateEscapeKey() {
    const event = new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape' });
    autocompleteHandler(this.cm, event);
  }
  
  // Simulate Backspace key press
  simulateBackspaceKey() {
    const event = new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace' });
    autocompleteHandler(this.cm, event);
  }

  destroy() {
    if (this.unregisterAutoComplete) this.unregisterAutoComplete();
    document.body.removeChild(this.textarea);
  }
}

describe("Auto-completion after Escape key", () => {
  // Mock setTimeout to execute immediately
  jest.useFakeTimers();
  
  const simpleTables = {
    users: ["name", "score", "birthDate"],
    countries: ["name", "population", "size"],
  };

  test("auto-completion should reappear after Escape key is pressed", async () => {
    const editor = new TestEditor({
      value: "SELECT users.",
      tables: simpleTables,
    });
    
    editor.cm.setCursor(Pos(0, 13)); // Set cursor position after "users."
    
    // Get initial completions
    const initialCompletions = await editor.hint();
    expect(initialCompletions.list.length).toBeGreaterThan(0);
    
    // Simulate showing the hint popup
    editor.cm.state.completionActive = {}; // Mock the completion being active
    
    // Simulate pressing Escape key
    editor.simulateEscapeKey();
    
    // Fast-forward timers
    jest.runAllTimers();
    
    // Get completions after Escape
    const afterEscapeCompletions = await editor.hint();
    
    // Verify we still get completions after pressing Escape
    expect(afterEscapeCompletions.list.length).toBeGreaterThan(0);
    expect(afterEscapeCompletions.list).toEqual(initialCompletions.list);
    
    editor.destroy();
  });

  test("auto-completion should reappear after Backspace key is pressed", async () => {
    const editor = new TestEditor({
      value: "SELECT FROM users",
      tables: simpleTables,
    });
    
    // Position cursor after FROM
    editor.cm.setCursor(Pos(0, 12));
    
    // Simulate backspace key press
    editor.simulateBackspaceKey();
    
    // Fast-forward timers
    jest.runAllTimers();
    
    // Get completions after Backspace
    const completions = await editor.hint();
    
    // Verify we get table completions after pressing Backspace in FROM context
    expect(completions.list.length).toBeGreaterThan(0);
    expect(completions.list.some(item => 
      item.text === 'users' || 
      item.text === 'countries'
    )).toBeTruthy();
    
    editor.destroy();
  });
});