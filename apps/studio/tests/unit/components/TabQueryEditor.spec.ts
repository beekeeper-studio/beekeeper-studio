import TabQueryEditor from "@/components/TabQueryEditor.vue";

// Regression coverage for the "auto-saving queries" bug.
//
// Every keystroke persists the live editor buffer into
// `OpenTab.unsavedQueryText` (the `unsavedText` watcher -> `tabs/save`), for
// both scratch queries and existing saved queries. On restore, however,
// `initializeQueries()` rehydrates the editor from
// `this.query?.text || this.tab.unsavedQueryText`. For a saved query
// `query.text` (the last *saved* version) is truthy, so it always wins and the
// persisted in-progress edits in `unsavedQueryText` are discarded.
//
// Result: edits to an unsaved/scratch query survive an app restart, but edits
// to an existing saved query are silently lost. These tests pin the expected
// behaviour — the editor should restore the unsaved edits while keeping the
// saved text as the dirty-comparison baseline.
describe("TabQueryEditor.vue — initializeQueries (query restore)", () => {
  // TabQueryEditor exports a plain options object (`export default {...}`), so
  // its methods live at `.methods`; `.options.methods` is the Vue.extend shape.
  const component = TabQueryEditor as any;
  const initializeQueries = (component.options?.methods ?? component.methods)
    .initializeQueries;

  function makeContext({
    query,
    tab,
  }: {
    query: { id?: number; text?: string } | null;
    tab: { queryId?: number; unsavedChanges: boolean; unsavedQueryText?: string };
  }) {
    return {
      query,
      tab,
      identifierDialect: "postgresql",
      paramTypes: undefined,
      // writable bits initializeQueries assigns to
      unsavedText: null as string | null,
      originalText: null as string | null,
      individualQueries: null as unknown,
      currentlySelectedQuery: null as unknown,
    };
  }

  it("restores in-progress edits to an existing saved query (the bug)", () => {
    const ctx = makeContext({
      query: { id: 42, text: "SELECT * FROM saved_version" },
      tab: {
        queryId: 42,
        unsavedChanges: true,
        unsavedQueryText: "SELECT * FROM edited_but_not_saved",
      },
    });

    initializeQueries.call(ctx);

    // The editor should show the persisted edits...
    expect(ctx.unsavedText).toBe("SELECT * FROM edited_but_not_saved");
    // ...while the saved text remains the baseline for dirty detection / diffing.
    expect(ctx.originalText).toBe("SELECT * FROM saved_version");
  });

  it("restores edits to an unsaved/scratch query (control — already works)", () => {
    const ctx = makeContext({
      query: null,
      tab: {
        unsavedChanges: true,
        unsavedQueryText: "SELECT * FROM scratch_edits",
      },
    });

    initializeQueries.call(ctx);

    expect(ctx.unsavedText).toBe("SELECT * FROM scratch_edits");
  });

  it("loads the saved text when a saved query has no unsaved edits", () => {
    const ctx = makeContext({
      query: { id: 7, text: "SELECT * FROM clean" },
      tab: { queryId: 7, unsavedChanges: false, unsavedQueryText: undefined },
    });

    initializeQueries.call(ctx);

    expect(ctx.unsavedText).toBe("SELECT * FROM clean");
    expect(ctx.originalText).toBe("SELECT * FROM clean");
  });
});
