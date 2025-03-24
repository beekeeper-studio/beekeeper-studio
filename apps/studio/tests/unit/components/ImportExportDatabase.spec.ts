import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import ImportExportDatabase from "@/components/importexportdatabase/ImportExportDatabase.vue";
import { ExportStatus } from "@/lib/export/models";

Vue.use(Vuex);

describe("ImportExportDatabase.vue", () => {
  let wrapper;
  let store;
  let mockDispatch;
  let mockCommit;

  beforeEach(() => {
    // Mock functions
    mockDispatch = jest.fn();
    mockCommit = jest.fn();

    // Create Vuex store
    store = new Vuex.Store({
      modules: {
        multiTableExports: {
          namespaced: true,
          state: {
            tablesToExport: [
              { name: "users", schema: "public" },
              { name: "orders", schema: "public" },
            ],
            tableOptions: {
              filePath: "/export/path",
              exporter: "csv",
              fileNameOptions: "full",
            },
          },
          getters: {
            isSelectTableComplete: () => true,
            isOptionsComplete: () => true,
          },
        },
        exports: {
          namespaced: true,
          state: {
            exports: [],
          },
          getters: {
            hasRunningExports: () => false,
          },
        },
      },
      state: {
        connection: {},
        isCommunity: false,
      },
      mutations: {
        "exports/addExport": mockCommit,
      },
      actions: {
        "multiTableExports/reset": mockDispatch,
        "exports/removeInactive": mockDispatch,
        updateTableColumns: mockDispatch,
        "export/batch": mockDispatch,
      },
    });

    // Create mock plugins/services
    const modalMock = {
      hide: jest.fn(),
      show: jest.fn(),
    };

    const nativeMock = {
      files: {
        open: jest.fn(),
      },
    };

    const utilMock = {
      send: jest.fn().mockResolvedValue({}),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };

    // Mount component with mocked store and services
    wrapper = mount(ImportExportDatabase, {
      store,
      mocks: {
        $modal: modalMock,
        $native: nativeMock,
        $util: utilMock,
      },
      propsData: {
        tab: {
          id: "1",
          isRunning: false,
        },
        schema: {},
      },
    });
  });

  // Test export steps configuration
  it("configures export steps correctly", () => {
    const exportSteps = wrapper.vm.exportSteps;
    expect(exportSteps.length).toBe(3);
    expect(exportSteps[0].title).toBe("Select Tables");
    expect(exportSteps[1].title).toBe("Configure Export");
    expect(exportSteps[2].title).toBe("Review & Execute");
  });

  // Test selected tables computation
  it("computes selected tables count correctly", () => {
    expect(wrapper.vm.selectedTables).toBe(2);
  });

  // Test export file name generation
  it("generates correct file names for tables", () => {
    const listTables = wrapper.vm.listTables;
    expect(listTables).toHaveLength(2);
    expect(listTables[0].name).toBe("public_users_full.csv");
    expect(listTables[1].name).toBe("public_orders_full.csv");
  });

  // Test export process initiation
  it("starts export process and manages tab running state", async () => {
    // Mock addExport method
    wrapper.vm.addExport = jest.fn().mockResolvedValue("export-id-1");

    // Trigger export
    await wrapper.vm.startExport();

    // Verify tab is marked as running
    expect(wrapper.vm.tab.isRunning).toBe(false);
  });

  // Test failed exports identification
  it("identifies failed exports correctly", async () => {
    // Setup store with some failed exports
    store.state.exports.exports = [
      { id: "export-1", status: ExportStatus.Error },
      { id: "export-2", status: ExportStatus.Completed },
    ];

    const failedExports = await wrapper.vm.checkForFailedExports([
      "export-1",
      "export-2",
    ]);

    expect(failedExports).toHaveLength(1);
    expect(failedExports[0]).toBe("export-1");
  });

  // Test modal behavior
  it("shows appropriate modal based on export status", async () => {
    // Mock the method to simulate some exports failing
    wrapper.vm.checkForFailedExports = jest
      .fn()
      .mockResolvedValue(["export-1"]);

    await wrapper.vm.startExport();

    // Verify fail modal is shown when exports fail
    expect(wrapper.vm.$modal.show).toHaveBeenCalledWith(`fail-modal-1`);
  });
});
