import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

// Minimal stub components for ConnectionSidebar and FavoriteList
const ConnectionSidebarStub = {
  template: "<div></div>",
  data() {
    return {
      draggingConnection: null,
    };
  },
  computed: {
    isCloud() {
      return this.$store.state.workspaceId > 0;
    },
    filteredConnections() {
      return this.$store.getters["data/connections/filteredConnections"];
    },
  },
  methods: {
    async onConnectionFolderHeaderDrop(folder) {
      if (!this.draggingConnection) return;
      try {
        if (this.isCloud) {
          await this.$store.dispatch("data/connections/save", {
            ...this.draggingConnection,
            connectionFolderId: folder.id,
            position: { before: null },
          });
        } else {
          const folderItems = this.filteredConnections.filter(
            (c) => c.connectionFolderId === folder.id
          );
          const newList = [
            this.draggingConnection,
            ...folderItems.filter((c) => c.id !== this.draggingConnection.id),
          ];
          await this.$store.dispatch(
            "data/connections/saveMany",
            newList.map((item, idx) => ({
              ...item,
              connectionFolderId: folder.id,
              position: idx + 1,
            }))
          );
        }
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
  computed: {
    isCloud() {
      return this.$store.state.workspaceId > 0;
    },
    filteredQueries() {
      return this.$store.getters["data/queries/filteredQueries"];
    },
  },
  methods: {
    async onQueryFolderHeaderDrop(folder) {
      if (!this.draggingQuery) return;
      try {
        if (this.isCloud) {
          await this.$store.dispatch("data/queries/save", {
            ...this.draggingQuery,
            queryFolderId: folder.id,
            position: { before: null },
          });
        } else {
          const folderItems = this.filteredQueries.filter(
            (q) => q.queryFolderId === folder.id
          );
          const newList = [
            this.draggingQuery,
            ...folderItems.filter((q) => q.id !== this.draggingQuery.id),
          ];
          await this.$store.dispatch(
            "data/queries/saveMany",
            newList.map((item, idx) => ({
              ...item,
              queryFolderId: folder.id,
              position: idx + 1,
            }))
          );
        }
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

  function createStore(isCloud: boolean, connections: any[] = []) {
    mockDispatch = jest.fn().mockResolvedValue({});
    return new Vuex.Store({
      state: {
        workspaceId: isCloud ? 1 : -1,
      },
      getters: {
        "data/connections/filteredConnections": () => connections,
      },
      actions: {
        "data/connections/save": mockDispatch,
        "data/connections/saveMany": mockDispatch,
      },
    });
  }

  beforeEach(() => {
    mockNoty = { error: jest.fn() };
  });

  describe("onConnectionFolderHeaderDrop", () => {
    it("does nothing when draggingConnection is null", async () => {
      store = createStore(false);
      wrapper = shallowMount(ConnectionSidebarStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      await wrapper.vm.onConnectionFolderHeaderDrop({ id: 1, name: "Folder" });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("cloud workspace: dispatches save with object-based position", async () => {
      store = createStore(true);
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
          id: 10,
          name: "My DB",
          connectionFolderId: 5,
          position: { before: null },
        }
      );
    });

    it("local workspace: dispatches saveMany with numeric positions", async () => {
      const existingConnections = [
        { id: 20, name: "Existing1", connectionFolderId: 5 },
        { id: 21, name: "Existing2", connectionFolderId: 5 },
      ];
      store = createStore(false, existingConnections);
      wrapper = shallowMount(ConnectionSidebarStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const connection = { id: 10, name: "My DB", connectionFolderId: null };
      wrapper.setData({ draggingConnection: connection });

      await wrapper.vm.onConnectionFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        [
          { id: 10, name: "My DB", connectionFolderId: 5, position: 1 },
          { id: 20, name: "Existing1", connectionFolderId: 5, position: 2 },
          { id: 21, name: "Existing2", connectionFolderId: 5, position: 3 },
        ]
      );
    });

    it("local workspace: prepends dragged item and excludes duplicate", async () => {
      const existingConnections = [
        { id: 10, name: "My DB", connectionFolderId: 5 },
        { id: 20, name: "Other", connectionFolderId: 5 },
      ];
      store = createStore(false, existingConnections);
      wrapper = shallowMount(ConnectionSidebarStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      // Dragging an item that's already in the folder (reordering to top)
      const connection = { id: 10, name: "My DB", connectionFolderId: 5 };
      wrapper.setData({ draggingConnection: connection });

      await wrapper.vm.onConnectionFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        [
          { id: 10, name: "My DB", connectionFolderId: 5, position: 1 },
          { id: 20, name: "Other", connectionFolderId: 5, position: 2 },
        ]
      );
    });

    it("local workspace: handles empty folder", async () => {
      store = createStore(false, []);
      wrapper = shallowMount(ConnectionSidebarStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const connection = { id: 10, name: "My DB", connectionFolderId: null };
      wrapper.setData({ draggingConnection: connection });

      await wrapper.vm.onConnectionFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        [{ id: 10, name: "My DB", connectionFolderId: 5, position: 1 }]
      );
    });
  });
});

describe("Folder Header Drop - Favorite List", () => {
  let wrapper;
  let store;
  let mockDispatch;
  let mockNoty;

  function createStore(isCloud: boolean, queries: any[] = []) {
    mockDispatch = jest.fn().mockResolvedValue({});
    return new Vuex.Store({
      state: {
        workspaceId: isCloud ? 1 : -1,
      },
      getters: {
        "data/queries/filteredQueries": () => queries,
      },
      actions: {
        "data/queries/save": mockDispatch,
        "data/queries/saveMany": mockDispatch,
      },
    });
  }

  beforeEach(() => {
    mockNoty = { error: jest.fn() };
  });

  describe("onQueryFolderHeaderDrop", () => {
    it("does nothing when draggingQuery is null", async () => {
      store = createStore(false);
      wrapper = shallowMount(FavoriteListStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      await wrapper.vm.onQueryFolderHeaderDrop({ id: 1, name: "Folder" });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("cloud workspace: dispatches save with object-based position", async () => {
      store = createStore(true);
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
          id: 10,
          title: "My Query",
          queryFolderId: 5,
          position: { before: null },
        }
      );
    });

    it("local workspace: dispatches saveMany with numeric positions", async () => {
      const existingQueries = [
        { id: 20, title: "Existing1", queryFolderId: 5 },
        { id: 21, title: "Existing2", queryFolderId: 5 },
      ];
      store = createStore(false, existingQueries);
      wrapper = shallowMount(FavoriteListStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const query = { id: 10, title: "My Query", queryFolderId: null };
      wrapper.setData({ draggingQuery: query });

      await wrapper.vm.onQueryFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        [
          { id: 10, title: "My Query", queryFolderId: 5, position: 1 },
          { id: 20, title: "Existing1", queryFolderId: 5, position: 2 },
          { id: 21, title: "Existing2", queryFolderId: 5, position: 3 },
        ]
      );
    });

    it("local workspace: prepends dragged item and excludes duplicate", async () => {
      const existingQueries = [
        { id: 10, title: "My Query", queryFolderId: 5 },
        { id: 20, title: "Other", queryFolderId: 5 },
      ];
      store = createStore(false, existingQueries);
      wrapper = shallowMount(FavoriteListStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const query = { id: 10, title: "My Query", queryFolderId: 5 };
      wrapper.setData({ draggingQuery: query });

      await wrapper.vm.onQueryFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        [
          { id: 10, title: "My Query", queryFolderId: 5, position: 1 },
          { id: 20, title: "Other", queryFolderId: 5, position: 2 },
        ]
      );
    });

    it("local workspace: handles empty folder", async () => {
      store = createStore(false, []);
      wrapper = shallowMount(FavoriteListStub, {
        store,
        mocks: { $noty: mockNoty },
      });

      const query = { id: 10, title: "My Query", queryFolderId: null };
      wrapper.setData({ draggingQuery: query });

      await wrapper.vm.onQueryFolderHeaderDrop({ id: 5, name: "Work" });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.anything(),
        [{ id: 10, title: "My Query", queryFolderId: 5, position: 1 }]
      );
    });
  });
});
