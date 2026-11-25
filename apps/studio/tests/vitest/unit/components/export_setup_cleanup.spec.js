import { describe, expect, it, vi } from "vitest";
import ImportExportDatabase from "@/components/importexportdatabase/ImportExportDatabase.vue";

describe("multi-table export setup", () => {
  it("clears the running flag and progress listeners when a table fails to prepare", async () => {
    const removed = [];
    const shown = [];
    const ctx = {
      tab: { id: "t1", isRunning: false },
      $modal: {
        hide: vi.fn(),
        show(name) {
          shown.push(name);
        },
      },
      listTables: [
        { table: { name: "a" } },
        { table: { name: "b" } },
      ],
      $store: {
        dispatch: vi.fn(async (_action, table) => {
          if (table.name === "b") {
            throw new Error("columns failed");
          }
        }),
        commit: vi.fn(),
      },
      addExport: vi.fn(async () => "exp-a"),
      $util: {
        addListener: vi.fn(),
        removeListener(name) {
          removed.push(name);
        },
        send: vi.fn(),
      },
      exportSteps: [{}, {}, { stepperProps: {} }],
    };

    await ImportExportDatabase.methods.startExport.call(ctx);

    expect(ctx.tab.isRunning).toBe(false);
    expect(removed).toEqual(["onExportProgress/exp-a"]);
    expect(shown).toEqual(["fail-modal-t1"]);
    expect(ctx.$util.send).not.toHaveBeenCalled();
    expect(ctx.exportSteps[2].stepperProps.exportsStarted).toBeUndefined();
  });
});
