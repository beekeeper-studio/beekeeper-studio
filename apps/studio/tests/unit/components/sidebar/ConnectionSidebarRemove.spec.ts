import ConnectionSidebar from "@/components/sidebar/ConnectionSidebar.vue";
import { buildItemNodes } from "@/common/utils/folderTree";
import { shallowMount } from "@vue/test-utils";
import fs from "fs";
import path from "path";
import Vue from "vue";
import Vuex, { Store } from "vuex";

Vue.use(Vuex);

const savedConnection = {
  id: 1,
  name: "My DB",
  connectionFolderId: null,
  connectionType: "postgresql",
  host: "localhost",
  port: 5432,
};

const recentConnection = {
  id: 100,
  connectionId: 1,
  workspaceId: -1,
  connectionType: "postgresql",
  host: "localhost",
  port: 5432,
  updatedAt: new Date(),
};

function createStore() {
  const removeUsedConnection = jest.fn().mockResolvedValue(undefined);
  const itemNodes = buildItemNodes(
    [savedConnection],
    "connectionFolderId",
    "name"
  );
  const store = new Vuex.Store({
    getters: {
      workspace: () => ({}),
      isCloud: () => false,
      isUltimate: () => true,
      canCreateFolders: () => true,
      "data/usedconnections/orderedUsedConfigs": () => [recentConnection],
      "settings/settings": () => ({}),
      "credentials/activeWorkspaces": () => [],
      "pinnedConnections/pinnedConnections": () => [],
      "data/connections/filteredConnections": () => [savedConnection],
      "settings/privacyMode": () => false,
    },
    modules: {
      "data/connections": {
        namespaced: true,
        state: {
          items: [savedConnection],
          loading: false,
          error: null,
          filter: null,
          pendingSaveIds: [],
          searching: false,
          folders: { fetchingIds: [] },
        },
        modules: {
          nodes: {
            namespaced: true,
            state: { items: itemNodes },
          },
        },
      },
      "data/connectionFolders": {
        namespaced: true,
        state: {
          items: [{ id: 1, name: "Root", parentId: null }],
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
      "data/usedconnections": {
        namespaced: true,
        actions: { remove: removeUsedConnection },
      },
    },
  });
  return { store, removeUsedConnection };
}

function mountConnectionSidebar(store: Store<unknown>) {
  return shallowMount(ConnectionSidebar as any, {
    store,
    stubs: {
      Tree: true,
      TreeFolder: true,
      ConnectionListItem: true,
      EditableText: true,
      ErrorAlert: true,
      ExpiredFolderAlert: true,
      SidebarLoading: true,
      WorkspaceSidebar: true,
      SidebarSortButtons: true,
    },
    mocks: {
      $confirm: jest.fn().mockResolvedValue(true),
      $settings: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      },
      $noty: { success: jest.fn(), error: jest.fn() },
      $root: { $emit: jest.fn() },
      $bks: { openMenu: jest.fn() },
    },
  });
}

describe("ConnectionSidebar remove handlers", () => {
  it("remove emits to parent for saved connection delete", () => {
    const { store } = createStore();
    const wrapper = mountConnectionSidebar(store);
    const vm = wrapper.vm as any;

    vm.remove(savedConnection);

    expect(wrapper.emitted("remove")).toEqual([[savedConnection]]);
  });

  it("removeUsedConfig dispatches to data/usedconnections/remove for recent entries", async () => {
    const { store, removeUsedConnection } = createStore();
    const wrapper = mountConnectionSidebar(store);
    const vm = wrapper.vm as any;

    await vm.removeUsedConfig(recentConnection);

    expect(removeUsedConnection).toHaveBeenCalledTimes(1);
    expect(removeUsedConnection).toHaveBeenCalledWith(
      expect.anything(),
      recentConnection
    );
    expect(wrapper.emitted("remove")).toBeUndefined();
  });

  it("wires saved connection templates to remove, not removeUsedConfig", () => {
    const sourcePath = path.resolve(
      __dirname,
      "../../../../src/components/sidebar/ConnectionSidebar.vue"
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    const cloudSearchBlock = source.match(
      /v-if="cloudSearchMode"[\s\S]*?<\/template>\s*<tree/
    )?.[0];
    const treeItemBlock = source.match(
      /#item="\{ node, selected: treeSelected, bulkSelectionActive \}"[\s\S]*?<\/template>\s*<\/tree>/
    )?.[0];
    const recentBlock = source.match(
      /recent-connection-list[\s\S]*?@remove="removeUsedConfig"/
    )?.[0];

    expect(cloudSearchBlock).toBeDefined();
    expect(cloudSearchBlock).toContain('@remove="remove"');
    expect(cloudSearchBlock).not.toContain('@remove="removeUsedConfig"');

    expect(treeItemBlock).toBeDefined();
    expect(treeItemBlock).toContain('@remove="remove"');
    expect(treeItemBlock).not.toContain('@remove="removeUsedConfig"');

    expect(recentBlock).toBeDefined();
  });
});
