import { convertKeybinding } from "@/common/bksConfig/BksConfigProvider";
import { matchesVHotkeyBinding } from "@/plugins/ConfigPlugin";
import TableTable from "@/components/tableview/TableTable.vue";

function keyboardEvent({
  keyCode,
  ctrlKey = false,
  altKey = false,
  shiftKey = false,
  metaKey = false,
}: {
  keyCode: number;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}) {
  return { keyCode, ctrlKey, altKey, shiftKey, metaKey } as KeyboardEvent;
}

describe("matchesVHotkeyBinding", () => {
  it("matches forward delete", () => {
    expect(matchesVHotkeyBinding(keyboardEvent({ keyCode: 46 }), "delete")).toBe(true);
  });

  it("matches meta+backspace", () => {
    expect(
      matchesVHotkeyBinding(keyboardEvent({ keyCode: 8, metaKey: true }), "meta+backspace")
    ).toBe(true);
  });

  it("matches ctrl+backspace", () => {
    expect(
      matchesVHotkeyBinding(keyboardEvent({ keyCode: 8, ctrlKey: true }), "ctrl+backspace")
    ).toBe(true);
  });

  it("does not match backspace when meta is required", () => {
    expect(matchesVHotkeyBinding(keyboardEvent({ keyCode: 8 }), "meta+backspace")).toBe(false);
  });
});

describe("TableTable.vue — row delete keybindings", () => {
  const deleteSelectionBindings = ["delete", "ctrlOrCmd+backspace"];

  describe("config key resolution", () => {
    it("maps deleteSelection without colliding with nullSelection on Mac", () => {
      const deleteKeys = deleteSelectionBindings.map((binding) =>
        convertKeybinding("v-hotkey", binding, "mac")
      );
      const nullKey = convertKeybinding("v-hotkey", "backspace", "mac");

      expect(deleteKeys).toEqual(["delete", "meta+backspace"]);
      expect(nullKey).toBe("backspace");
      expect(deleteKeys).not.toContain(nullKey);
    });

    it("maps deleteSelection without colliding with nullSelection on Linux", () => {
      const deleteKeys = deleteSelectionBindings.map((binding) =>
        convertKeybinding("v-hotkey", binding, "linux")
      );
      const nullKey = convertKeybinding("v-hotkey", "backspace", "linux");

      expect(deleteKeys).toEqual(["delete", "ctrl+backspace"]);
      expect(nullKey).toBe("backspace");
      expect(deleteKeys).not.toContain(nullKey);
    });
  });

  describe("handleDeleteSelectionKeydown", () => {
    const handleDeleteSelectionKeydown = (TableTable as any).options.methods.handleDeleteSelectionKeydown;

    function makeContext({
      active = true,
      focusingTable = true,
      editable = true,
      bindings = ["delete", "meta+backspace"],
    } = {}) {
      const deleteTableSelection = jest.fn();
      const preventDefault = jest.fn();

      const ctx = {
        active,
        focusingTable: () => focusingTable,
        editable,
        $bksConfig: {
          getKeybindings: () => bindings,
        },
        deleteTableSelection,
      };

      return { ctx, deleteTableSelection, preventDefault };
    }

    it("does nothing when the tab is inactive", () => {
      const { ctx, deleteTableSelection } = makeContext({ active: false });
      const event = keyboardEvent({ keyCode: 8, metaKey: true });

      handleDeleteSelectionKeydown.call(ctx, event);

      expect(deleteTableSelection).not.toHaveBeenCalled();
    });

    it("deletes rows on meta+backspace from config bindings", () => {
      const { ctx, deleteTableSelection } = makeContext();
      const event = keyboardEvent({ keyCode: 8, metaKey: true });
      event.preventDefault = jest.fn();

      handleDeleteSelectionKeydown.call(ctx, event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(deleteTableSelection).toHaveBeenCalledWith(event);
    });

    it("deletes rows on forward delete from config bindings", () => {
      const { ctx, deleteTableSelection } = makeContext();
      const event = keyboardEvent({ keyCode: 46 });
      event.preventDefault = jest.fn();

      handleDeleteSelectionKeydown.call(ctx, event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(deleteTableSelection).toHaveBeenCalledWith(event);
    });

    it("ignores plain backspace so nullSelection can handle it", () => {
      const { ctx, deleteTableSelection } = makeContext();
      const event = keyboardEvent({ keyCode: 8 });

      handleDeleteSelectionKeydown.call(ctx, event);

      expect(deleteTableSelection).not.toHaveBeenCalled();
    });
  });

  describe("keymap", () => {
    const keymap = (TableTable as any).options.computed.keymap;

    it("does not register deleteSelection in v-hotkey", () => {
      const map = keymap.call({
        active: true,
        $vHotkeyKeymap: (bindings: Record<string, unknown>) => bindings,
        refreshTable: jest.fn(),
        cellAddRow: jest.fn(),
        saveChanges: jest.fn(),
        copyToSql: jest.fn(),
        copySelection: jest.fn(),
        pasteSelection: jest.fn(),
        cloneSelection: jest.fn(),
        pasteAsNewRowsShortcut: jest.fn(),
        nullTableSelection: jest.fn(),
        navigatePage: jest.fn(),
        openEditorMenuByShortcut: jest.fn(),
      });

      expect(map["general.deleteSelection"]).toBeUndefined();
      expect(map["tableTable.nullSelection"]).toBeDefined();
    });
  });
});
