import { describe, it, expect, vi } from "vitest";
import TabQueryEditor from "@/components/TabQueryEditor.vue";

// TabQueryEditor.submitQuery asks before an UPDATE or DELETE without a WHERE
// clause runs (#4842). The methods run against a stand-in for the component.
const { submitQuery, confirmUnfilteredWrites } = (TabQueryEditor as any).methods;

function createEditor({
  setting = "always",
  isProduction = false,
  confirmed = true,
}: { setting?: string; isProduction?: boolean; confirmed?: boolean } = {}) {
  const execute = vi.fn(async () => []);
  const editor: any = {
    $bksConfig: { ui: { queryEditor: { warnOnUnfilteredWrites: setting } } },
    usedConfig: { id: null, isProduction },
    identifierDialect: "generic",
    identifyDialect: "generic",
    paramTypes: undefined,
    $confirm: vi.fn(async () => confirmed),
    connection: { query: vi.fn(async () => ({ execute })) },
    canManageTransactions: true,
    isManualCommit: true,
    hasActiveTransaction: false,
    manualBegin: vi.fn(),
    running: false,
    remoteDeleted: false,
    hasParams: false,
    tab: { id: 1 },
    updateTab: vi.fn(),
    maybeCloseWarningNoty: vi.fn(),
    $modal: { hide: vi.fn(), show: vi.fn() },
    $store: { state: {}, dispatch: vi.fn() },
    $tour: { start: vi.fn() },
  };
  editor.confirmUnfilteredWrites = confirmUnfilteredWrites.bind(editor);
  // the query that would run, as the deparameterizedQuery computed gives it
  Object.defineProperty(editor, "deparameterizedQuery", {
    get: () => editor.queryForExecution,
  });
  return editor;
}

describe("the warning before an UPDATE or DELETE without WHERE", () => {
  it("runs nothing, and starts no transaction, when the user cancels", async () => {
    const editor = createEditor({ confirmed: false });

    await submitQuery.call(editor, "DELETE FROM users");

    expect(editor.$confirm).toHaveBeenCalledTimes(1);
    expect(editor.$confirm.mock.calls[0][1]).toContain("DELETE FROM users");
    expect(editor.manualBegin).not.toHaveBeenCalled();
    expect(editor.connection.query).not.toHaveBeenCalled();
  });

  it("runs the query once the user confirms", async () => {
    const editor = createEditor({ confirmed: true });

    await submitQuery.call(editor, "UPDATE users SET active = false");

    expect(editor.$confirm).toHaveBeenCalledTimes(1);
    expect(editor.connection.query).toHaveBeenCalledWith(
      "UPDATE users SET active = false", 1, expect.anything(), false
    );
  });

  it.each([
    "DELETE FROM users WHERE id = 1",
    "SELECT * FROM users",
  ])("runs %s without asking", async (sql) => {
    const editor = createEditor();

    await submitQuery.call(editor, sql);

    expect(editor.$confirm).not.toHaveBeenCalled();
    expect(editor.connection.query).toHaveBeenCalledTimes(1);
  });

  it("asks only on production connections when set to production", async () => {
    const development = createEditor({ setting: "production", isProduction: false });
    await submitQuery.call(development, "DELETE FROM users");
    expect(development.$confirm).not.toHaveBeenCalled();
    expect(development.connection.query).toHaveBeenCalledTimes(1);

    const production = createEditor({ setting: "production", isProduction: true, confirmed: false });
    await submitQuery.call(production, "DELETE FROM users");
    expect(production.$confirm).toHaveBeenCalledTimes(1);
    expect(production.connection.query).not.toHaveBeenCalled();
  });

  it("never asks when set to never", async () => {
    const editor = createEditor({ setting: "never", isProduction: true });

    await submitQuery.call(editor, "DELETE FROM users");

    expect(editor.$confirm).not.toHaveBeenCalled();
    expect(editor.connection.query).toHaveBeenCalledTimes(1);
  });

  // The parameters modal submits the query a second time; it was confirmed
  // on the first.
  it("does not ask again for a run from the parameters modal", async () => {
    const editor = createEditor();

    await submitQuery.call(editor, "DELETE FROM users", true);

    expect(editor.$confirm).not.toHaveBeenCalled();
    expect(editor.connection.query).toHaveBeenCalledTimes(1);
  });
});
