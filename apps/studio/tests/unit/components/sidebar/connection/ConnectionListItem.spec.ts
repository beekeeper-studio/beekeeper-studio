import ConnectionListItem from "@/components/sidebar/connection/ConnectionListItem.vue";
import { shallowMount } from "@vue/test-utils";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);
TimeAgo.addLocale(en);

function buildStore(savedConnections: any[] = []) {
  return new Vuex.Store({
    state: { workspaceId: -1 },
    getters: {
      isCloud: () => false,
      isUltimate: () => true,
    },
    modules: {
      "data/connections": {
        namespaced: true,
        state: { items: savedConnections },
      },
      "data/connectionFolders": {
        namespaced: true,
        state: { items: [] },
      },
    },
  });
}

function buildBksMock(openMenu = jest.fn()) {
  return {
    simpleConnectionString: (c: any) =>
      `${c.host}:${c.port}/${c.defaultDatabase}`,
    buildConnectionString: (c: any) =>
      `${c.connectionType}://${c.username}@${c.host}:${c.port}/${c.defaultDatabase}`,
    openMenu,
  };
}

function mountItem(opts: {
  config: any;
  isRecentList: boolean;
  saved?: any[];
  selectedConfig?: any;
  bulkSelectionActive?: boolean;
  selected?: boolean;
  selectedCount?: number;
  openMenu?: jest.Mock;
}) {
  const openMenu = opts.openMenu ?? jest.fn();
  return shallowMount(ConnectionListItem as any, {
    store: buildStore(opts.saved ?? []),
    propsData: {
      config: opts.config,
      isRecentList: opts.isRecentList,
      selectedConfig: opts.selectedConfig ?? null,
      showDuplicate: false,
      pinned: false,
      privacyMode: false,
      bulkSelectionActive: opts.bulkSelectionActive ?? false,
      selected: opts.selected ?? false,
      selectedCount: opts.selectedCount ?? 0,
    },
    mocks: { $bks: buildBksMock(openMenu) },
  });
}

const savedConfig = {
  id: 7,
  workspaceId: -1,
  name: "My DB",
  connectionType: "postgresql",
  host: "db.example.com",
  port: 5432,
  username: "user",
  defaultDatabase: "mydb",
  labelColor: "default",
};

function contextMenuEvent() {
  return { stopPropagation: jest.fn(), target: { tagName: "DIV" } };
}

describe("ConnectionListItem displayConfig", () => {
  it("uses the linked saved connection for display when in the recent list", () => {
    // The used_connection has stale snapshot data
    const usedConfig = {
      id: 100,
      connectionId: 7,
      workspaceId: -1,
      connectionType: "postgresql",
      host: "old-host.example.com",
      port: 5432,
      username: "olduser",
      defaultDatabase: "mydb",
      sshHost: "old-ssh.example.com",
      updatedAt: new Date(),
    };

    // The saved connection has fresh data
    const saved = {
      id: 7,
      workspaceId: -1,
      name: "My DB",
      connectionType: "postgresql",
      host: "new-host.example.com",
      port: 6543,
      username: "newuser",
      defaultDatabase: "mydb",
      sshHost: "new-ssh.example.com",
      labelColor: "default",
    };

    const wrapper = mountItem({
      config: usedConfig,
      isRecentList: true,
      saved: [saved],
    });

    expect(wrapper.vm["displayConfig"]).toBe(saved);
    expect(wrapper.vm["title"]).toContain("new-host.example.com");
    expect(wrapper.vm["title"]).toContain("newuser");
    expect(wrapper.vm["title"]).not.toContain("old-host.example.com");
    expect(wrapper.html()).toContain("new-ssh.example.com");
    expect(wrapper.html()).not.toContain("old-ssh.example.com");
  });

  it("falls back to the snapshot when the linked saved connection is missing", () => {
    // Orphan recent entry: connectionId points at a saved connection that no
    // longer exists. The display falls back to the snapshot.
    const usedConfig = {
      id: 100,
      connectionId: 999,
      workspaceId: -1,
      connectionType: "postgresql",
      host: "snapshot-host.example.com",
      port: 5432,
      username: "snapshotuser",
      defaultDatabase: "mydb",
      updatedAt: new Date(),
    };

    const wrapper = mountItem({
      config: usedConfig,
      isRecentList: true,
      saved: [],
    });

    expect(wrapper.vm["displayConfig"]).toBe(usedConfig);
    expect(wrapper.vm["title"]).toContain("snapshot-host.example.com");
  });

  it("uses the row config directly when not a recent-list item", () => {
    // A saved-connection row in the sidebar - displayConfig is the config itself.
    const saved = {
      id: 7,
      workspaceId: -1,
      name: "My DB",
      connectionType: "postgresql",
      host: "saved-host.example.com",
      port: 5432,
      username: "user",
      defaultDatabase: "mydb",
      labelColor: "default",
    };

    const wrapper = mountItem({
      config: saved,
      isRecentList: false,
      saved: [saved],
    });

    expect(wrapper.vm["displayConfig"]).toBe(saved);
    expect(wrapper.vm["title"]).toContain("saved-host.example.com");
  });
});

describe("ConnectionListItem active state", () => {
  const saved = {
    id: 7,
    workspaceId: -1,
    name: "My DB",
    connectionType: "postgresql",
    host: "db.example.com",
    port: 5432,
    labelColor: "default",
  };

  it("highlights the row the connection screen is editing", () => {
    // The connection screen edits a *copy* of the row, so this can never be
    // an identity comparison.
    const wrapper = mountItem({
      config: saved,
      isRecentList: false,
      selectedConfig: { ...saved },
    });

    expect(wrapper.vm["classList"].active).toBe(true);
  });

  it("does not highlight a different connection", () => {
    const wrapper = mountItem({
      config: saved,
      isRecentList: false,
      selectedConfig: { ...saved, id: 8 },
    });

    expect(wrapper.vm["classList"].active).toBe(false);
  });
});

describe("ConnectionListItem context menu", () => {
  it("Delete handler emits remove with the row config", () => {
    const openMenu = jest.fn();
    const wrapper = mountItem({
      config: savedConfig,
      isRecentList: false,
      saved: [savedConfig],
      openMenu,
    });

    wrapper.vm.showContextMenu(contextMenuEvent());

    const deleteOption = openMenu.mock.calls[0][0].options.find(
      (o: { name: string }) => o.name === "Delete"
    );
    deleteOption.handler();

    expect(wrapper.emitted("remove")?.[0]).toEqual([savedConfig]);
  });

  it("shows only Delete when multiple items are selected", () => {
    const openMenu = jest.fn();
    const wrapper = mountItem({
      config: savedConfig,
      isRecentList: false,
      saved: [savedConfig],
      bulkSelectionActive: true,
      selected: true,
      selectedCount: 2,
      openMenu,
    });

    wrapper.vm.showContextMenu(contextMenuEvent());

    const options = openMenu.mock.calls[0][0].options;
    expect(options).toHaveLength(1);
    expect(options[0].name).toBe("Delete");
    options[0].handler();
    expect(wrapper.emitted("remove-selected")).toHaveLength(1);
  });

  it("adds an unselected row to the selection and shows only Delete", () => {
    const openMenu = jest.fn();
    const wrapper = mountItem({
      config: savedConfig,
      isRecentList: false,
      saved: [savedConfig],
      bulkSelectionActive: true,
      selected: false,
      selectedCount: 1,
      openMenu,
    });

    wrapper.vm.showContextMenu(contextMenuEvent());

    expect(wrapper.emitted("add-to-selection")?.[0]).toEqual([savedConfig]);
    const options = openMenu.mock.calls[0][0].options;
    expect(options).toHaveLength(1);
    expect(options[0].name).toBe("Delete");
  });
});
