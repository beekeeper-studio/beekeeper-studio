import FavoriteList from "@/components/sidebar/core/FavoriteList.vue";
import { buildItemNodes } from "@/common/utils/folderTree";
import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex, { Store } from "vuex";

Vue.use(Vuex);

const q1 = { id: 1, title: "Query 1", queryFolderId: null };
const q2 = { id: 2, title: "Query 2", queryFolderId: null };
const q3 = { id: 3, title: "Query 3", queryFolderId: null };

function createStore(queries = [q1, q2, q3]) {
  const remove = jest.fn().mockResolvedValue(undefined);
  const itemNodes = buildItemNodes(queries, "queryFolderId", "title");
  const store = new Vuex.Store({
    getters: {
      workspace: () => ({}),
      isCloud: () => false,
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
          filter: undefined,
          pendingSaveIds: [],
          searching: false,
          folders: { fetchingIds: [] },
        },
        getters: {
          filteredQueries: (state) => state.items,
        },
        actions: { remove },
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
          sidebar: {
            namespaced: true,
            state: { expandedIds: [] },
            mutations: {
              expandedIds(state, ids) {
                state.expandedIds = ids;
              },
            },
          },
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
  it("toggleChecked adds and removes items by id", () => {
    const { store } = createStore();
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.toggleChecked(q1);
    expect(vm.isChecked(q1)).toBe(true);
    expect(vm.checkedFavorites).toHaveLength(1);

    vm.toggleChecked(q2);
    expect(vm.checkedFavorites).toHaveLength(2);

    vm.toggleChecked(q1);
    expect(vm.isChecked(q1)).toBe(false);
    expect(vm.checkedFavorites).toHaveLength(1);
    expect(vm.checkedFavorites[0].id).toBe(2);
  });

  it("selectRange selects contiguous visible items", () => {
    const { store } = createStore();
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.selectionAnchor = q1;
    vm.selectRange(q1, q3);

    expect(vm.checkedFavorites.map((q: { id: number }) => q.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it("select with shiftKey uses range selection from the anchor", () => {
    const { store } = createStore();
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.selectionAnchor = q1;
    vm.select(q3, { shiftKey: true });

    expect(vm.checkedFavorites.map((q: { id: number }) => q.id)).toEqual([
      1, 2, 3,
    ]);
    expect(vm.selected).toBe(q3);
  });

  it("select with metaKey toggles bulk selection", () => {
    const { store } = createStore();
    const { wrapper } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.select(q1, { metaKey: true });
    vm.select(q2, { metaKey: true });

    expect(vm.checkedFavorites.map((q: { id: number }) => q.id)).toEqual([
      1, 2,
    ]);
  });

  it("removeCheckedFavorites shows one confirm and removes all checked items", async () => {
    const { store, remove } = createStore();
    const { wrapper, confirm } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.checkedFavorites = [q1, q2];

    await vm.removeCheckedFavorites();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith("Delete 2 saved queries?", undefined, {
      variant: "danger",
    });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith(expect.anything(), q1);
    expect(remove).toHaveBeenCalledWith(expect.anything(), q2);
    expect(vm.checkedFavorites).toHaveLength(0);
  });

  it("removeCheckedFavorites uses the item title when deleting one query", async () => {
    const { store, remove } = createStore([q1]);
    const { wrapper, confirm } = mountFavoriteList(store);
    const vm = wrapper.vm as any;

    vm.checkedFavorites = [q1];

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
    vm.checkedFavorites = [q1, q2];

    await vm.removeCheckedFavorites();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(vm.checkedFavorites).toHaveLength(2);
  });
});
