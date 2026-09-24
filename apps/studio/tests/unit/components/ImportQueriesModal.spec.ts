import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import ImportQueriesModal from "@/components/data/ImportQueriesModal.vue";

Vue.use(Vuex);

// ImportQueriesModal calls registerHandlers (from AppEventMixin) in mounted().
// Stub it so the component can mount without the global mixin.
const handlersMixin = {
  methods: {
    registerHandlers: jest.fn(),
    unregisterHandlers: jest.fn(),
  },
};

describe("ImportQueriesModal.vue", () => {
  let wrapper;
  let store;
  let saveDispatch;
  let utilMock;

  // The picker's v-model is a list of query ids. doImport() fetches each query
  // from the local appdb via $util.send before saving it into the workspace.
  function mountModal(localQueries: Record<number, any>) {
    saveDispatch = jest.fn().mockResolvedValue(1);
    store = new Vuex.Store({
      actions: {
        "data/queries/save": saveDispatch,
      },
    });

    const modalMock = { show: jest.fn(), hide: jest.fn() };
    utilMock = {
      send: jest.fn().mockImplementation(async (_name: string, args: any) => {
        const id = args?.options?.where?.id;
        return localQueries[id] ?? null;
      }),
    };

    return shallowMount(ImportQueriesModal, {
      store,
      mixins: [handlersMixin],
      // <modal> is a globally registered component (vue-js-modal) that isn't
      // available in the test environment.
      stubs: { modal: true },
      mocks: {
        $modal: modalMock,
        $util: utilMock,
      },
    });
  }

  // Folder IDs are workspace-scoped: a local folder id does not exist in the
  // target (cloud/team) workspace. Carrying it over makes the backend reject
  // the import with a 400. Imported queries must land in the personal folder.
  it("clears queryFolderId so foldered queries import into the personal folder", async () => {
    // A query that lives inside a local folder, selected for import.
    const localQuery = {
      id: 42,
      title: "My Query",
      text: "select 1",
      queryFolderId: 5,
    };
    wrapper = mountModal({ 42: localQuery });

    await wrapper.setData({ selectedQueries: [42] });

    await wrapper.vm.doImport();

    expect(saveDispatch).toHaveBeenCalledTimes(1);
    const payload = saveDispatch.mock.calls[0][1];
    expect(payload.queryFolderId).toBeNull();
    expect(payload.id).toBeNull();
    // The rest of the query is preserved on the copy.
    expect(payload.title).toBe("My Query");
    expect(payload.text).toBe("select 1");
  });

  it("only imports selected queries", async () => {
    wrapper = mountModal({
      1: { id: 1, title: "Keep", queryFolderId: 3 },
      2: { id: 2, title: "Skip", queryFolderId: 3 },
    });

    await wrapper.setData({ selectedQueries: [1] });

    await wrapper.vm.doImport();

    expect(saveDispatch).toHaveBeenCalledTimes(1);
    expect(saveDispatch.mock.calls[0][1].title).toBe("Keep");
  });
});
