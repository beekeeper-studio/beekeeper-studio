import FavoriteList from "@/components/sidebar/core/FavoriteList.vue";
import { buildItemNodes } from "@/common/utils/folderTree";
import { TreeExpansionModule } from "@/store/modules/sidebar/TreeExpansionModule";
import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex, { Store } from "vuex";

Vue.use(Vuex);

const q1 = { id: 1, title: "Query 1", queryFolderId: null };
const q2 = { id: 2, title: "Query 2", queryFolderId: null };
const q3 = { id: 3, title: "Query 3", queryFolderId: null };

function createStore(queries = [q1, q2, q3], { isCloud = false, filter = undefined } = {}) {
  const remove = jest.fn().mockResolvedValue(undefined);
  const itemNodes = buildItemNodes(queries, "queryFolderId", "title");
  const store = new Vuex.Store({
    getters: {
      workspace: () => ({}),
      isCloud: () => isCloud,
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
          items: queries,
          loading: false,
          error: null,
          filter,
          pendingSaveIds: [],
          searching: false,
          folders: { fetchingIds: [] },
        },
        getters: {
          filteredQueries: (state) => state.items,
        },
        actions: { remove, setSavedQueryFilter: jest.fn() },
        modules: {
          nodes: {
            namespaced: true,
            state: { items: itemNodes },
          },
        },
      },
      "data/queryFolders": {
        namespaced: true,
        state: {
          items: [],
          loading: false,
          error: null,
          folders: { fetchingIds: [] },
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
  return { store, remove };
}

function mountFavoriteList(store: Store<unknown>) {
  const confirm = jest.fn().mockResolvedValue(true);
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
    },
    mocks: {
      $confirm: confirm,
      $modal: { show: jest.fn(), hide: jest.fn() },
      $noty: { success: jest.fn(), error: jest.fn() },
      $root: { $emit: jest.fn() },
      $bks: { openMenu: jest.fn() },
    },
  });
  return { wrapper, confirm };
}

describe("FavoriteList bulk delete", () => {
  it("toggleChecked adds and removes selectedIds", () => {
    const { store } = createStore();
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.toggleChecked(q1);
    expect(vm.isChecked(q1)).toBe(true);
    expect(vm.selectedIds).toEqual(["item-1"]);

    vm.toggleChecked(q2);
    expect(vm.selectedIds).toEqual(["item-1", "item-2"]);

    vm.toggleChecked(q1);
    expect(vm.isChecked(q1)).toBe(false);
    expect(vm.selectedIds).toEqual(["item-2"]);
  });

  it("unfiltered shiftKey select ranges visible tree items", () => {
    const { store } = createStore([q1, q2, q3]);
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.select(q1, {});
    vm.select(q3, { shiftKey: true });

    expect(vm.selectedIds).toEqual(["item-1", "item-2", "item-3"]);
    expect(vm.selected).toBe(q3);
  });

  it("cloud search select with shiftKey uses range selection from the anchor", () => {
    const { store } = createStore([q1, q2, q3], { isCloud: true, filter: "q" });
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.filterQuery = "q";
    vm.cloudSelectionAnchorId = "item-1";
    vm.select(q3, { shiftKey: true });

    expect(vm.selectedIds).toEqual(["item-1", "item-2", "item-3"]);
    expect(vm.selected).toBe(q3);
  });

  it("cloud search shiftKey without an anchor ranges from the first filtered query", () => {
    const { store } = createStore([q1, q2, q3], { isCloud: true, filter: "q" });
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.filterQuery = "q";
    vm.select(q3, { shiftKey: true });

    expect(vm.selectedIds).toEqual(["item-1", "item-2", "item-3"]);
    expect(vm.selected).toBe(q3);
  });

  it("cloud search select with metaKey toggles bulk selection", () => {
    const { store } = createStore([q1, q2], { isCloud: true, filter: "q" });
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.filterQuery = "q";
    vm.select(q1, { metaKey: true });
    vm.select(q2, { metaKey: true });

    expect(vm.selectedIds).toEqual(["item-1", "item-2"]);
  });

  it("removeCheckedFavorites shows one confirm and removes all selected items", async () => {
    const { store, remove } = createStore();
    const { wrapper, confirm } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.selectedIds = ["item-1", "item-2"];

    await vm.removeCheckedFavorites();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith("Delete 2 saved queries?", undefined, {
      variant: "danger",
    });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith(expect.anything(), q1);
    expect(remove).toHaveBeenCalledWith(expect.anything(), q2);
    expect(vm.selectedIds).toHaveLength(0);
  });

  it("removeCheckedFavorites uses the item title when deleting one query", async () => {
    const { store, remove } = createStore([q1]);
    const { wrapper, confirm } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.selectedIds = ["item-1"];

    await vm.removeCheckedFavorites();

    expect(confirm).toHaveBeenCalledWith('Delete "Query 1"?', undefined, {
      variant: "danger",
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("removeCheckedFavorites does nothing when confirm is declined", async () => {
    const { store, remove } = createStore();
    const { wrapper, confirm } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    confirm.mockResolvedValue(false);
    vm.selectedIds = ["item-1", "item-2"];

    await vm.removeCheckedFavorites();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(vm.selectedIds).toHaveLength(2);
  });
});
