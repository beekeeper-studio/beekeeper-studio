import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import TabTablesOverview from "@/components/TabTablesOverview.vue";

Vue.use(Vuex);

describe("TabTablesOverview.vue", () => {
  const overview = {
    tables: [
      {
        schemaName: "public",
        tableName: "events",
        rowCount: 10000,
        totalSize: 4096,
        tableSize: 3072,
        indexSize: 1024,
        freeSpace: null,
        fragmentation: 0.25,
        canOptimize: true,
        optimizationNote: "VACUUM ANALYZE can reclaim space.",
      },
      {
        schemaName: "public",
        tableName: "users",
        rowCount: 20,
        totalSize: 512,
        tableSize: 512,
        indexSize: 0,
        freeSpace: null,
        fragmentation: null,
        canOptimize: false,
        optimizationNote: null,
      },
    ],
    freeSpace: null,
    canOptimize: true,
    optimizationNote: "VACUUM ANALYZE will process all tables that need optimization.",
  };

  function mountComponent({
    supportedFeatures = {
      tableOverview: true,
      tableOptimization: true,
    },
    connection = {
      getTablesOverview: jest.fn().mockResolvedValue(overview),
      optimizeTable: jest.fn().mockResolvedValue(undefined),
    },
  } = {}) {
    const store = new Vuex.Store({
      state: {
        connection,
        supportedFeatures,
      },
    });

    const wrapper = shallowMount(TabTablesOverview, {
      store,
      propsData: {
        tabId: 1,
        active: false,
        tab: {},
      },
      mocks: {
        $confirm: jest.fn().mockResolvedValue(true),
        $noty: {
          success: jest.fn(),
          error: jest.fn(),
        },
      },
      stubs: {
        "x-progressbar": true,
        "x-button": true,
        "status-bar": true,
      },
    });

    return { wrapper, connection };
  }

  it("loads the tables overview when initialized", async () => {
    const { wrapper, connection } = mountComponent();

    await wrapper.vm.initialize();

    expect(connection.getTablesOverview).toHaveBeenCalled();
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.rows).toEqual(overview.tables);
    expect(wrapper.vm.totalRows).toBe(10020);
    expect(wrapper.vm.totalSize).toBe(4608);
    expect(wrapper.vm.hasOptimizableRows).toBe(true);
    expect(wrapper.vm.hasDatabaseOptimization).toBe(true);
    expect(wrapper.vm.hasFragmentation).toBe(true);
  });

  it("optimizes one table and refreshes the overview", async () => {
    const { wrapper, connection } = mountComponent();
    wrapper.setData({ overview });
    wrapper.vm.refresh = jest.fn().mockResolvedValue(undefined);

    await wrapper.vm.optimize(overview.tables[0]);

    expect(wrapper.vm.$confirm).toHaveBeenCalledWith(
      "Optimize events?",
      "VACUUM ANALYZE can reclaim space."
    );
    expect(connection.optimizeTable).toHaveBeenCalledWith("events", "public");
    expect(wrapper.vm.$noty.success).toHaveBeenCalledWith("events optimized successfully");
    expect(wrapper.vm.refresh).toHaveBeenCalled();
  });

  it("optimizes the database and refreshes the overview", async () => {
    const { wrapper, connection } = mountComponent();
    wrapper.setData({ overview });
    wrapper.vm.refresh = jest.fn().mockResolvedValue(undefined);

    await wrapper.vm.optimizeDatabase();

    expect(wrapper.vm.$confirm).toHaveBeenCalledWith(
      "Optimize database?",
      "VACUUM ANALYZE will process all tables that need optimization."
    );
    expect(connection.optimizeTable).toHaveBeenCalledWith(null, null);
    expect(wrapper.vm.$noty.success).toHaveBeenCalledWith("Database optimized successfully");
    expect(wrapper.vm.refresh).toHaveBeenCalled();
  });
});
