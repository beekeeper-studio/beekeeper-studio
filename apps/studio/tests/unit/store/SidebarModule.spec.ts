import Vuex, { Store } from "vuex";
import Vue from "vue";
import { SidebarModule } from "@/store/modules/SidebarModule";

Vue.use(Vuex);

const GLOBAL_SIDEBAR_ACTIVE_ITEM_KEY = "globalSidebarActiveItem-v1";

function createStore(): Store<any> {
  return new Vuex.Store({
    modules: {
      sidebar: SidebarModule,
    },
  });
}

function setConfigDefault(value: string | undefined) {
  (window as any).bksConfig = {
    ui: { layout: { defaultSidebarItem: value } },
  };
}

describe("SidebarModule global sidebar default tab", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as any).bksConfig;
  });

  it("defaults to 'tables' when nothing is stored or configured", () => {
    const store = createStore();
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("tables");
  });

  it("applies the configured default when the user has no stored choice", () => {
    setConfigDefault("queries");
    const store = createStore();

    // Before init the store falls back to 'tables' because bksConfig isn't
    // read in the state factory.
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("tables");

    store.dispatch("sidebar/initGlobalSidebarActiveItem");
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("queries");
  });

  it("keeps the user's stored choice over the configured default", () => {
    localStorage.setItem(GLOBAL_SIDEBAR_ACTIVE_ITEM_KEY, JSON.stringify("history"));
    setConfigDefault("queries");

    const store = createStore();
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("history");

    store.dispatch("sidebar/initGlobalSidebarActiveItem");
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("history");
  });

  it("ignores an invalid configured default", () => {
    setConfigDefault("nonsense");
    const store = createStore();

    store.dispatch("sidebar/initGlobalSidebarActiveItem");
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("tables");
  });

  it("persists a user selection to localStorage", () => {
    const store = createStore();
    store.dispatch("sidebar/setGlobalSidebarActiveItem", "queries");

    expect(store.state.sidebar.globalSidebarActiveItem).toBe("queries");
    expect(JSON.parse(localStorage.getItem(GLOBAL_SIDEBAR_ACTIVE_ITEM_KEY) as string)).toBe("queries");
  });
});
