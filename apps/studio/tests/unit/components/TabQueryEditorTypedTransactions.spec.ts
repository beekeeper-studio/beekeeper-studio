jest.mock("@beekeeperstudio/ui-kit/vue/sql-text-editor", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@beekeeperstudio/ui-kit/vue/surreal-text-editor", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@beekeeperstudio/ui-kit/vue/super-formatter", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@beekeeperstudio/ui-kit", () => ({ __esModule: true, divider: {} }), { virtual: true });
jest.mock("@uiw/codemirror-theme-monokai", () => ({ monokaiInit: jest.fn(() => ({})) }));
jest.mock("@/lib/editor/utils", () => ({ EditorMarker: {} }));
jest.mock("@/lib/editor/CodeMirrorPlugins", () => ({ findSqlQueryIdentifierDialect: jest.fn() }));
jest.mock("@/lib/editor/extensions/queryMagicExtension", () => ({ queryMagicExtension: jest.fn() }));
jest.mock("@/lib/editor/vim", () => ({ getVimKeymapsFromVimrc: jest.fn() }));
jest.mock("@/components/editor/ProgressBar.vue", () => ({ __esModule: true, default: { name: "ProgressBar" } }));
jest.mock("@/components/editor/ResultTable.vue", () => ({ __esModule: true, default: { name: "ResultTable" } }));
jest.mock("@/components/editor/ShortcutHints.vue", () => ({ __esModule: true, default: { name: "ShortcutHints" } }));
jest.mock("@/components/editor/QueryEditorStatusBar.vue", () => ({ __esModule: true, default: { name: "QueryEditorStatusBar" } }));
jest.mock("@/components/editor/QueryEditHistory.vue", () => ({ __esModule: true, default: { name: "QueryEditHistory" } }));
jest.mock("@/components/editor/MergeManager.vue", () => ({ __esModule: true, default: { name: "MergeManager" } }));
jest.mock("@/components/common/ErrorAlert.vue", () => ({ __esModule: true, default: { name: "ErrorAlert" } }));
jest.mock("@/components/common/form/InAppFolderPicker.vue", () => ({ __esModule: true, default: { name: "InAppFolderPicker" } }));

import TabQueryEditor from "@/components/TabQueryEditor.vue";

const options = (TabQueryEditor as any).options ?? (TabQueryEditor as any);
const methods = options.methods;

// Builds the minimal `this` submitQuery and its helpers touch, in the state a
// tab is in while a manual-commit transaction is active. `calls` records the
// order of connection operations, with 'execute' marking when the submitted
// statement actually runs.
function context(overrides: Record<string, any> = {}) {
  const calls: string[] = [];
  const connection = {
    query: jest.fn(async () => {
      calls.push("query");
      return {
        execute: jest.fn(async () => {
          calls.push("execute");
          return [{ rows: [], fields: [], rowCount: 0, totalRowCount: 0 }];
        }),
        cancel: jest.fn(),
      };
    }),
    reserveConnection: jest.fn(async () => { calls.push("reserveConnection"); }),
    releaseConnection: jest.fn(async () => { calls.push("releaseConnection"); }),
    startTransaction: jest.fn(async () => { calls.push("startTransaction"); }),
    commitTransaction: jest.fn(async () => { calls.push("commitTransaction"); }),
    rollbackTransaction: jest.fn(async () => { calls.push("rollbackTransaction"); }),
  };

  const vm: any = {
    calls,
    connection,
    // the state under test: manual-commit mode with an active transaction
    isManualCommit: true,
    hasActiveTransaction: true,
    // computeds, provided as plain values
    canManageTransactions: true,
    identifyDialect: "mssql",
    remoteDeleted: false,
    hasParams: false,
    defaultSchema: "dbo",
    usedConfig: { id: 1 },
    get deparameterizedQuery() { return this.queryForExecution; },
    // data
    tab: { id: 42, isRunning: false },
    query: null,
    running: false,
    runningQuery: null,
    runningCount: 1,
    results: [],
    resultsEditData: [],
    resultEditableMap: [],
    editingResult: false,
    selectedResult: 0,
    error: null,
    queryForExecution: null,
    individualQueries: [],
    dryRun: false,
    showKeepAlive: false,
    warningNoty: null,
    enteredTransactionFromIdent: false,
    showTransactionActiveTooltip: false,
    // collaborators
    updateTab: jest.fn(),
    cancelQuery: jest.fn(),
    $modal: { show: jest.fn(), hide: jest.fn() },
    $store: { state: {}, dispatch: jest.fn() },
    $tour: { start: jest.fn() },
    $noty: { error: jest.fn(), success: jest.fn() },
    ...overrides,
  };

  // the real methods under test
  vm.submitQuery = methods.submitQuery.bind(vm);
  vm.toggleCommitMode = methods.toggleCommitMode.bind(vm);
  vm.maybeCloseWarningNoty = methods.maybeCloseWarningNoty.bind(vm);
  vm.maybeReserveConnection = methods.maybeReserveConnection.bind(vm);
  vm.manualBegin = methods.manualBegin.bind(vm);

  return vm;
}

describe("TabQueryEditor typed COMMIT/ROLLBACK with an active manual transaction", () => {
  it("typed COMMIT must not roll the transaction back", async () => {
    const vm = context();

    await vm.submitQuery("COMMIT");

    // Today the sequence is: rollbackTransaction, releaseConnection, query,
    // execute — the user's work is rolled back before their COMMIT ever runs.
    expect(vm.calls).not.toContain("rollbackTransaction");
    expect(vm.error).toBeNull();
  });

  it("typed COMMIT must execute before the tab's reserved connection is released", async () => {
    const vm = context();

    await vm.submitQuery("COMMIT");

    expect(vm.calls).toContain("execute");
    // nothing may drop the reservation before the statement has run — the
    // COMMIT has to happen on the connection that owns the transaction
    const upToExecute = vm.calls.slice(0, vm.calls.indexOf("execute") + 1);
    expect(upToExecute).not.toContain("releaseConnection");

    // leaving manual mode once the transaction has ended is correct
    expect(vm.isManualCommit).toBe(false);
    expect(vm.hasActiveTransaction).toBe(false);
  });

  it("typed ROLLBACK must execute before the tab's reserved connection is released", async () => {
    const vm = context();

    await vm.submitQuery("ROLLBACK");

    // Today the reservation is rolled back and released first, so the user's
    // ROLLBACK text lands on an unreserved pool connection (error 3903 on
    // SQL Server).
    expect(vm.calls).toContain("execute");
    const upToExecute = vm.calls.slice(0, vm.calls.indexOf("execute") + 1);
    expect(upToExecute).not.toContain("releaseConnection");

    expect(vm.isManualCommit).toBe(false);
    expect(vm.hasActiveTransaction).toBe(false);
  });

  it("typed COMMIT sends the statement to the tab's own connection", async () => {
    const vm = context();

    await vm.submitQuery("COMMIT");

    expect(vm.connection.query).toHaveBeenCalledTimes(1);
    expect(vm.connection.query.mock.calls[0][0]).toBe("COMMIT");
    expect(vm.connection.query.mock.calls[0][1]).toBe(42);
  });
});
