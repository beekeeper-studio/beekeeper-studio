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

describe("SidebarModule global sidebar default tab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 'tables' when nothing is stored or configured", () => {
    const store = createStore();
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("tables");
  });

  it("applies the supplied default when the user has no stored choice", () => {
    const store = createStore();

    // The state factory falls back to 'tables'; the configured default is
    // applied by the component on connect.
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("tables");

    store.dispatch("sidebar/applyDefaultGlobalSidebarActiveItem", "queries");
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("queries");
  });

  it("keeps the user's stored choice over the supplied default", () => {
    localStorage.setItem(GLOBAL_SIDEBAR_ACTIVE_ITEM_KEY, JSON.stringify("history"));

    const store = createStore();
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("history");

    store.dispatch("sidebar/applyDefaultGlobalSidebarActiveItem", "queries");
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("history");
  });

  it("ignores an invalid supplied default", () => {
    const store = createStore();

    store.dispatch("sidebar/applyDefaultGlobalSidebarActiveItem", "nonsense");
    expect(store.state.sidebar.globalSidebarActiveItem).toBe("tables");
  });

  it("persists a user selection to localStorage", () => {
    const store = createStore();
    store.dispatch("sidebar/setGlobalSidebarActiveItem", "queries");

    expect(store.state.sidebar.globalSidebarActiveItem).toBe("queries");
    expect(JSON.parse(localStorage.getItem(GLOBAL_SIDEBAR_ACTIVE_ITEM_KEY) as string)).toBe("queries");
  });
});
