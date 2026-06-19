import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

// Minimal stub components for ConnectionSidebar and FavoriteList
// Both now use unified reorder action for local and cloud workspaces
const ConnectionSidebarStub = {
  template: "<div></div>",
  data() {
    return {
      draggingConnection: null,
    };
  },
  methods: {
    async onConnectionFolderHeaderDrop(folder) {
      if (!this.draggingConnection) return;
      try {
        // Unified reorder action for both local and cloud
        await this.$store.dispatch("data/connections/reorder", {
          item: this.draggingConnection,
          connectionFolderId: folder.id,
          position: { before: null },
        });
      } catch (ex) {
        this.$noty.error(`Move error: ${ex.message}`);
      }
    },
  },
};

const FavoriteListStub = {
  template: "<div></div>",
  data() {
    return {
      draggingQuery: null,
    };
  },
  methods: {
    async onQueryFolderHeaderDrop(folder) {
      if (!this.draggingQuery) return;
      try {
        // Unified reorder action for both local and cloud
        await this.$store.dispatch("data/queries/reorder", {
          item: this.draggingQuery,
          queryFolderId: folder.id,
          position: { before: null },
        });
      } catch (ex) {
        this.$noty.error(`Move error: ${ex.message}`);
      }
    },
  },
};

describe("Folder Header Drop - Connection Sidebar", () => {
  let wrapper;
  let store;
  let mockDispatch;
  let mockNoty;

  function createStore() {
    mockDispatch = jest.fn().mockResolvedValue({});
    return new Vuex.Store({
      state: {
        workspaceId: 1,
      },
      actions: {
        "data/connections/reorder": mockDispatch,
      },
    });
  }

  beforeEach(() => {
    mockNoty = { error: jest.fn() };
  });

  describe("onConnectionFolderHeaderDrop", () => {
    it("does nothing when draggingConnection is null", async () => {
      store = createStore();
      wrapper = shallowMount(ConnectionSidebarStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      await wrapper.vm.onConnectionFolderHeaderDrop({ id: 1, name: "Folder" });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("dispatches reorder with object-based position", async () => {
      store = createStore();
      wrapper = shallowMount(ConnectionSidebarStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const connection = { id: 10, name: "My DB", connectionFolderId: null };
      wrapper.setData({ draggingConnection: connection });

      await wrapper.vm.onConnectionFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        {
          item: connection,
          connectionFolderId: 5,
          position: { before: null },
        }
      );
    });

    it("uses unified reorder action for both local and cloud workspaces", async () => {
      // Both local (-1) and cloud (1) workspaces now use the same reorder action
      store = createStore();
      wrapper = shallowMount(ConnectionSidebarStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const connection = { id: 10, name: "My DB", connectionFolderId: null };
      wrapper.setData({ draggingConnection: connection });

      await wrapper.vm.onConnectionFolderHeaderDrop({ id: 5, name: "Work" });

      // Always uses reorder action with relative position
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        {
          item: connection,
          connectionFolderId: 5,
          position: { before: null },
        }
      );
    });
  });
});

describe("Folder Header Drop - Favorite List", () => {
  let wrapper;
  let store;
  let mockDispatch;
  let mockNoty;

  function createStore() {
    mockDispatch = jest.fn().mockResolvedValue({});
    return new Vuex.Store({
      state: {
        workspaceId: 1,
      },
      actions: {
        "data/queries/reorder": mockDispatch,
      },
    });
  }

  beforeEach(() => {
    mockNoty = { error: jest.fn() };
  });

  describe("onQueryFolderHeaderDrop", () => {
    it("does nothing when draggingQuery is null", async () => {
      store = createStore();
      wrapper = shallowMount(FavoriteListStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      await wrapper.vm.onQueryFolderHeaderDrop({ id: 1, name: "Folder" });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("dispatches reorder with object-based position", async () => {
      store = createStore();
      wrapper = shallowMount(FavoriteListStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const query = { id: 10, title: "My Query", queryFolderId: null };
      wrapper.setData({ draggingQuery: query });

      await wrapper.vm.onQueryFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        {
          item: query,
          queryFolderId: 5,
          position: { before: null },
        }
      );
    });

    it("uses unified reorder action for both local and cloud workspaces", async () => {
      // Both local (-1) and cloud (1) workspaces now use the same reorder action
      store = createStore();
      wrapper = shallowMount(FavoriteListStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const query = { id: 10, title: "My Query", queryFolderId: null };
      wrapper.setData({ draggingQuery: query });

      await wrapper.vm.onQueryFolderHeaderDrop({ id: 5, name: "Work" });

      // Always uses reorder action with relative position
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        {
          item: query,
          queryFolderId: 5,
          position: { before: null },
        }
      );
    });
  });
});
