import { describe, it, expect, vi } from "vitest";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import { findDangerousQueries } from "@/lib/db/dangerousQueries";

// Running an UPDATE or DELETE without a WHERE clause asks for confirmation
// first. conn/query refuses those queries unless the editor passes
// dangerousQueryApproved, which it only does once the user has confirmed.

const { submitQuery, confirmDangerousQueries } = (TabQueryEditor as any).methods;

function createContext({ confirmed = false, hasParams = false } = {}) {
  const ctx: any = {
    remoteDeleted: false,
    running: false,
    runningQuery: null,
    cancelQuery: vi.fn(),
    canManageTransactions: false,
    isManualCommit: false,
    hasActiveTransaction: false,
    maybeCloseWarningNoty: vi.fn(),
    identifyDialect: "psql",
    hasParams,
    paramsModalRequired: false,
    individualQueries: [{ parameters: [":id"] }],
    queryForExecution: null,
    get deparameterizedQuery() {
      return this.queryForExecution;
    },
    dangerousQueryApproved: false,
    dryRun: false,
    tab: { id: 7 },
    updateTab: vi.fn(),
    $modal: { show: vi.fn(), hide: vi.fn() },
    $confirm: vi.fn(async () => confirmed),
    connection: {
      findDangerousQueries: vi.fn(async (text: string) => findDangerousQueries(text, "psql")),
      // Only what reaches conn/query matters here, so stop the run there.
      query: vi.fn(async () => {
        throw new Error("stop");
      }),
    },
  };
  ctx.confirmDangerousQueries = confirmDangerousQueries.bind(ctx);
  return ctx;
}

describe("TabQueryEditor.vue — unscoped UPDATE/DELETE", () => {
  it("asks before running an unscoped DELETE", async () => {
    const ctx = createContext({ confirmed: false });
    await submitQuery.call(ctx, "DELETE FROM users");

    expect(ctx.$confirm).toHaveBeenCalledWith(
      "You did not scope this query",
      "This will delete every record on this table. Are you sure you want to continue?",
      { confirmLabel: "Continue", variant: "danger" }
    );
  });

  it("runs nothing when the user cancels", async () => {
    const ctx = createContext({ confirmed: false });
    ctx.running = true;
    ctx.runningQuery = {};
    await submitQuery.call(ctx, "UPDATE users SET active = false");

    expect(ctx.connection.query).not.toHaveBeenCalled();
    // a query that was already running keeps running
    expect(ctx.cancelQuery).not.toHaveBeenCalled();
  });

  it("passes the approval to conn/query when the user confirms", async () => {
    const ctx = createContext({ confirmed: true });
    await submitQuery.call(ctx, "DELETE FROM users");

    expect(ctx.connection.query).toHaveBeenCalledWith(
      "DELETE FROM users",
      7,
      { dryRun: false, dangerousQueryApproved: true },
      false
    );
  });

  it("runs scoped queries without asking", async () => {
    const ctx = createContext();
    await submitQuery.call(ctx, "DELETE FROM users WHERE id = 1");

    expect(ctx.$confirm).not.toHaveBeenCalled();
    expect(ctx.connection.query).toHaveBeenCalledWith(
      "DELETE FROM users WHERE id = 1",
      7,
      { dryRun: false, dangerousQueryApproved: false },
      false
    );
  });

  it("asks once when the query also needs parameters", async () => {
    const ctx = createContext({ confirmed: true, hasParams: true });
    await submitQuery.call(ctx, "UPDATE users SET name = :name");
    expect(ctx.$modal.show).toHaveBeenCalledWith("parameters-modal-7");
    expect(ctx.connection.query).not.toHaveBeenCalled();

    // the parameters modal submits the same query again
    await submitQuery.call(ctx, ctx.queryForExecution, true);

    expect(ctx.$confirm).toHaveBeenCalledTimes(1);
    expect(ctx.connection.query).toHaveBeenCalledWith(
      "UPDATE users SET name = :name",
      7,
      { dryRun: false, dangerousQueryApproved: true },
      false
    );
  });

  it("still runs when the check itself fails, leaving conn/query to refuse", async () => {
    const ctx = createContext();
    ctx.connection.findDangerousQueries = vi.fn(async () => {
      throw new Error("utility process unavailable");
    });
    await submitQuery.call(ctx, "DELETE FROM users");

    expect(ctx.$confirm).not.toHaveBeenCalled();
    expect(ctx.connection.query).toHaveBeenCalledWith(
      "DELETE FROM users",
      7,
      { dryRun: false, dangerousQueryApproved: false },
      false
    );
  });
});
