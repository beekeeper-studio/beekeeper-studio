import { describe, it, expect, vi, afterEach } from "vitest";
import ResultTable from "@/components/editor/ResultTable.vue";
import TableTable from "@/components/tableview/TableTable.vue";

// Shift+Enter opens the cell editor modal. v-hotkey listens on the whole
// document, and plugin iframes (e.g. the AI Shell) forward their key events to
// it, so typing a newline in a plugin prompt used to open the modal for
// whichever grid had a selected cell.

function createGrid() {
  const element = document.createElement("div");
  element.className = "tabulator";
  const tableholder = document.createElement("div");
  tableholder.className = "tabulator-tableholder";
  tableholder.tabIndex = 0;
  element.appendChild(tableholder);
  document.body.appendChild(element);

  const cell = { getValue: () => "alice" };
  const tabulator = {
    element,
    getRanges: () => [{ getCells: () => [[cell]] }],
  };
  return { tabulator, tableholder, cell };
}

/** Dispatches Shift+Enter on `target` and returns the event as a document
 * listener (like v-hotkey) receives it. */
function pressShiftEnter(target: EventTarget): KeyboardEvent {
  let received: KeyboardEvent | undefined;
  const listener = (e: KeyboardEvent) => (received = e);
  document.addEventListener("keydown", listener);
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true })
  );
  document.removeEventListener("keydown", listener);
  return received!;
}

function appendToBody<T extends HTMLElement>(el: T): T {
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ResultTable.vue — editor modal shortcut", () => {
  const { openEditorMenuByShortcut } = (ResultTable as any).methods;
  const { keymap } = (ResultTable as any).computed;

  function createContext() {
    const grid = createGrid();
    const ctx = {
      tabulator: grid.tabulator,
      openCellEditorModal: vi.fn(),
      cellEditCheck: () => true,
    };
    return { ctx, ...grid };
  }

  it("opens the modal for Shift+Enter in the grid", () => {
    const { ctx, tableholder, cell } = createContext();
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(tableholder));
    expect(ctx.openCellEditorModal).toHaveBeenCalledWith(cell, false);
  });

  it("ignores Shift+Enter forwarded from a plugin iframe", () => {
    const { ctx } = createContext();
    // WebPluginLoader re-dispatches plugin key events on the document
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(document));
    expect(ctx.openCellEditorModal).not.toHaveBeenCalled();
  });

  it("ignores Shift+Enter in an editor outside the grid", () => {
    const { ctx } = createContext();
    const sqlEditor = appendToBody(document.createElement("div"));
    sqlEditor.contentEditable = "true";
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(sqlEditor));
    expect(ctx.openCellEditorModal).not.toHaveBeenCalled();
  });

  it("binds no shortcuts while its tab is inactive", () => {
    const ctx = {
      active: false,
      $vHotkeyKeymap: (bindings: Record<string, unknown>) => bindings,
      copySelection: vi.fn(),
      focusOnFilterInput: vi.fn(),
      saveChanges: vi.fn(),
      copyToSql: vi.fn(),
      pasteSelection: vi.fn(),
      openEditorMenuByShortcut: vi.fn(),
      nullTableSelection: vi.fn(),
    };
    expect(keymap.call(ctx)).toEqual({});

    ctx.active = true;
    expect(keymap.call(ctx)["tableTable.openEditorModal"]).toBeDefined();
  });
});

describe("TableTable.vue — editor modal shortcut", () => {
  const { openEditorMenuByShortcut } = (TableTable as any).options.methods;

  function createContext() {
    const grid = createGrid();
    const ctx = {
      tabulator: grid.tabulator,
      openCellEditorModal: vi.fn(),
      isEditorMenuDisabled: () => false,
    };
    return { ctx, ...grid };
  }

  it("opens the modal for Shift+Enter in the grid", () => {
    const { ctx, tableholder, cell } = createContext();
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(tableholder));
    expect(ctx.openCellEditorModal).toHaveBeenCalledWith(cell, false);
  });

  it("still opens the modal from an inline cell editor", () => {
    const { ctx, tabulator, cell } = createContext();
    const cellEditor = document.createElement("textarea");
    tabulator.element.appendChild(cellEditor);
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(cellEditor));
    expect(ctx.openCellEditorModal).toHaveBeenCalledWith(cell, false);
  });

  it("ignores Shift+Enter forwarded from a plugin iframe", () => {
    const { ctx } = createContext();
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(document));
    expect(ctx.openCellEditorModal).not.toHaveBeenCalled();
  });

  it("ignores Shift+Enter in the filter input", () => {
    const { ctx } = createContext();
    const filterInput = appendToBody(document.createElement("input"));
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(filterInput));
    expect(ctx.openCellEditorModal).not.toHaveBeenCalled();
  });

  it("ignores Shift+Enter before the grid is built", () => {
    const ctx = { tabulator: null, openCellEditorModal: vi.fn() };
    openEditorMenuByShortcut.call(ctx, pressShiftEnter(document));
    expect(ctx.openCellEditorModal).not.toHaveBeenCalled();
  });
});
