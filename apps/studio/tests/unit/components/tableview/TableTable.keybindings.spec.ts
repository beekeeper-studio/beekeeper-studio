import { convertKeybinding } from "@/common/bksConfig/BksConfigProvider";
import TableTable from "@/components/tableview/TableTable.vue";

describe("TableTable.vue — row delete keybindings", () => {
  const deleteSelectionBindings = ["delete", "ctrlOrCmd+backspace"];

  describe("config key resolution", () => {
    it("maps deleteSelection without colliding with nullSelection on Mac", () => {
      const deleteKeys = deleteSelectionBindings.map((binding) =>
        convertKeybinding("v-hotkey", binding, "mac")
      );
      const nullKey = convertKeybinding("v-hotkey", "backspace", "mac");

      expect(deleteKeys).toEqual(["backspace", "meta+backspace"]);
      expect(nullKey).toBe("backspace");
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

  describe("keymap", () => {
    const keymap = (TableTable as any).options.computed.keymap;

    function makeKeymapContext() {
      return {
        active: true,
        $vHotkeyKeymap: (bindings: Record<string, unknown>) => bindings,
        refreshTable: jest.fn(),
        cellAddRow: jest.fn(),
        saveChanges: jest.fn(),
        copyToSql: jest.fn(),
        copySelection: jest.fn(),
        pasteSelection: jest.fn(),
        cloneSelection: jest.fn(),
        deleteTableSelection: jest.fn(),
        pasteAsNewRowsShortcut: jest.fn(),
        nullTableSelection: jest.fn(),
        navigatePage: jest.fn(),
        openEditorMenuByShortcut: jest.fn(),
      };
    }

    it("registers deleteSelection in v-hotkey", () => {
      const ctx = makeKeymapContext();
      const map = keymap.call(ctx);

      expect(map["general.deleteSelection"]).toBeDefined();
      expect(map["tableTable.nullSelection"]).toBeDefined();
    });
  });
});
