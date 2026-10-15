import { describe, it, expect, vi } from "vitest";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import { MAX_QUERY_LENGTH } from "@/common/utils";

// A query tab saved with a whole data dump froze the app on every reconnect:
// the text was parsed and loaded into the editor before anything else could
// run (#4862). Exercise the methods directly - mounting the editor would drag
// in CodeMirror and the store.
const component = TabQueryEditor as any;
const { initializeQueries, discardOversizedText } =
  (component.options ?? component).methods;

const blank = "\n\n\n";
const huge = () => "x".repeat(MAX_QUERY_LENGTH + 1);

function context(tab: Record<string, any>, savedText?: string): any {
  const vm: any = {
    tab: { id: 1, title: "Query #1", unsavedChanges: false, ...tab },
    query: { text: savedText },
    identifierDialect: "mysql",
    paramTypes: undefined,
    unsavedText: blank,
    originalText: "",
    individualQueries: [],
    currentlySelectedQuery: null,
    saveTab: vi.fn(),
    $noty: { error: vi.fn() },
  };
  vm.discardOversizedText = discardOversizedText.bind(vm);
  return vm;
}

describe("TabQueryEditor oversized tab text", () => {
  it("drops text over the limit instead of loading it", () => {
    const vm = context({ unsavedQueryText: huge() });

    initializeQueries.call(vm);

    expect(vm.unsavedText).toBe(blank);
    expect(vm.tab.unsavedQueryText).toBeNull();
    expect(vm.tab.unsavedChanges).toBe(false);
    expect(vm.saveTab).toHaveBeenCalled();
    expect(vm.$noty.error).toHaveBeenCalledWith(expect.stringContaining("Query #1"));
  });

  it("falls back to the saved query when its unsaved edits are over the limit", () => {
    const vm = context(
      { queryId: 3, unsavedChanges: true, unsavedQueryText: huge() },
      "select 1"
    );

    initializeQueries.call(vm);

    expect(vm.unsavedText).toBe("select 1");
    expect(vm.originalText).toBe("select 1");
    expect(vm.tab.unsavedChanges).toBe(false);
  });

  it("loads text right at the limit", () => {
    const text = "x".repeat(MAX_QUERY_LENGTH);
    const vm = context({ unsavedQueryText: text });

    initializeQueries.call(vm);

    expect(vm.unsavedText).toBe(text);
    expect(vm.saveTab).not.toHaveBeenCalled();
    expect(vm.$noty.error).not.toHaveBeenCalled();
  });

  it("loads normal tab text untouched", () => {
    const vm = context({ unsavedQueryText: "select 1" });

    initializeQueries.call(vm);

    expect(vm.unsavedText).toBe("select 1");
    expect(vm.tab.unsavedQueryText).toBe("select 1");
    expect(vm.saveTab).not.toHaveBeenCalled();
  });
});
