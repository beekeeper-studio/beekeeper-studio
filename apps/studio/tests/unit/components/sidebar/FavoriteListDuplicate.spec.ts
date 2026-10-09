import FavoriteList from "@/components/sidebar/core/FavoriteList.vue";
import { TreeExpansionModule } from "@/store/modules/sidebar/TreeExpansionModule";
import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex, { Store } from "vuex";

Vue.use(Vuex);

jest.mock("@beekeeperstudio/ui-kit/vue/tree", () => ({
  Tree: { name: "Tree", render: () => null },
  TreeFolder: { name: "TreeFolder", render: () => null },
}));

const query = {
  id: 1,
  title: "Query 1",
  queryFolderId: 5,
  position: 2,
  database: "mydb",
  membership: { userId: 1 },
  canWrite: true,
};

const fullQuery = {
  id: 1,
  title: "Query 1",
  text: "SELECT 1",
  excerpt: "SELECT 1",
  database: "mydb",
};

function createStore() {
  const findOne = jest.fn().mockResolvedValue(fullQuery);
  const clone = jest.fn().mockImplementation((_ctx, item) =>
    Promise.resolve({ ...item, id: null, createdAt: null })
  );
  const save = jest.fn().mockResolvedValue(2);
  const store = new Vuex.Store({
    getters: {
      workspace: () => ({}),
      isCloud: () => false,
      isCommunity: () => false,
      isUltimate: () => false,
      canCreateFolders: () => true,
    },
    modules: {
      tabs: {
        namespaced: true,
        state: { active: null },
      },
      "data/queries": {
        namespaced: true,
        state: {
          items: [query],
          loading: false,
          error: null,
          filter: undefined,
          pendingSaveIds: [],
          searching: false,
        },
        getters: {
          filteredQueries: (state) => state.items,
        },
        actions: { findOne, clone, save },
        modules: {
          nodes: {
            namespaced: true,
            state: { items: [] },
          },
        },
      },
      "data/queryFolders": {
        namespaced: true,
        state: {
          items: [],
          loading: false,
          error: null,
        },
        modules: {
          nodes: {
            namespaced: true,
            state: { items: [] },
          },
        },
      },
      sidebar: {
        namespaced: true,
        modules: {
          queries: TreeExpansionModule,
        },
      },
    },
  });
  return { store, findOne, clone, save };
}

function mountFavoriteList(store: Store<unknown>) {
  const wrapper = shallowMount(FavoriteList as any, {
    store,
    stubs: {
      Tree: true,
      TreeFolder: true,
      FavoriteListItem: true,
      EditableText: true,
      ErrorAlert: true,
      ExpiredFolderAlert: true,
      SidebarLoading: true,
      "x-button": true,
      "x-buttons": true,
      "x-menu": true,
      "x-menuitem": true,
      "x-label": true,
    },
    mocks: {
      $noty: { success: jest.fn(), error: jest.fn() },
      $root: { $emit: jest.fn() },
      $bks: { openMenu: jest.fn() },
    },
  });
  return wrapper;
}

describe("FavoriteList duplicate", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads the full query then saves a copy with text and Copy of title", async () => {
    const { store, findOne, clone, save } = createStore();
    const wrapper = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    await vm.duplicate(query);

    expect(findOne).toHaveBeenCalledWith(expect.anything(), 1);
    expect(clone).toHaveBeenCalledWith(expect.anything(), query);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toEqual({
      title: "Copy of Query 1",
      text: "SELECT 1",
      excerpt: "SELECT 1",
      queryFolderId: 5,
      position: 2,
    });
    expect(vm.$noty.success).toHaveBeenCalledWith("Query duplicated");
    wrapper.destroy();
  });

  it("shows an error toast when save fails", async () => {
    const { store, save } = createStore();
    save.mockRejectedValue(new Error("NOT NULL constraint failed"));
    const wrapper = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    await vm.duplicate(query);

    expect(vm.$noty.error).toHaveBeenCalledWith(
      "Could not duplicate query: NOT NULL constraint failed"
    );
    expect(vm.$noty.success).not.toHaveBeenCalled();
    wrapper.destroy();
  });
});
