import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { AppDbHandlers } from "@/handlers/appDbHandlers";
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { QueryAudit } from "@/common/appdb/models/QueryAudit";
import { TransportQueryAudit } from "@/common/transport/TransportQueryAudit";

async function saveQuery(obj: any) {
  return await AppDbHandlers["appdb/query/save"]({ obj, options: undefined });
}

async function listAudits(queryId: number): Promise<TransportQueryAudit[]> {
  return await AppDbHandlers["appdb/queryAudit/find"]({
    options: {
      where: { favoriteQueryId: queryId },
      order: { revision: "DESC" },
    },
  });
}

function newQuery(overrides: Record<string, any> = {}) {
  return {
    title: "My Query",
    text: "select 1",
    excerpt: "select 1",
    ...overrides,
  };
}

describe("Query audit handlers", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
  });

  afterEach(async () => {
    await TestOrmConnection.disconnect();
  });

  it("records a create audit when a new query is saved", async () => {
    const saved = await AppDbHandlers["appdb/query/save"]({ obj: newQuery() });

    const audits = await listAudits(saved.id);
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("create");
    expect(audits[0].revision).toBe(1);
    expect(Number.isNaN(new Date(audits[0].createdAt).getTime())).toBe(false);
  });

  it("records an update audit when title or text changes", async () => {
    const saved = await AppDbHandlers["appdb/query/save"]({ obj: newQuery() });
    await saveQuery({ ...saved, text: "select 2" });

    const audits = await listAudits(saved.id);
    expect(audits.map((a) => a.action)).toEqual(["update", "create"]);
    expect(audits[0].revision).toBe(2);
  });

  it("stores null for fields that did not change", async () => {
    const saved = await AppDbHandlers["appdb/query/save"]({
      obj: newQuery({ title: "Original", text: "select 1" }),
    });
    // Change only the text, then only the title.
    await saveQuery({ ...saved, text: "select 2" });
    await saveQuery({ ...saved, title: "Renamed", text: "select 2" });

    const audits = await QueryAudit.find({
      select: ["action", "title", "text"],
      where: {
        favoriteQueryId: saved.id,
      },
      order: {
        revision: "ASC",
      },
    });

    // create -> full snapshot
    expect(audits[0].action).toBe("create");
    expect(audits[0].title).toBe("Original");
    expect(audits[0].text).toBe("select 1");
    // only text changed -> title null
    expect(audits[1].title).toBeNull();
    expect(audits[1].text).toBe("select 2");
    // only title changed -> text null
    expect(audits[2].title).toBe("Renamed");
    expect(audits[2].text).toBeNull();
  });

  it("does not record an audit when nothing relevant changed", async () => {
    const saved = await saveQuery(newQuery());
    // Re-save with only a position change.
    await saveQuery({ ...saved, position: 5 });

    const audits = await listAudits(saved.id);
    expect(audits).toHaveLength(1);
  });

  it("records a create from current state when a query has no history yet", async () => {
    // Simulate a query whose history is missing (e.g. predates the feature;
    // real upgrades get a baseline via the migration backfill).
    const saved = await AppDbHandlers["appdb/query/save"]({
      obj: newQuery({ text: "original" }),
    });
    await QueryAudit.delete({ favoriteQueryId: saved.id });
    await expect(QueryAudit.count()).resolves.toBe(0);

    await saveQuery({ ...saved, text: "edited" });

    const audits = await listAudits(saved.id);
    expect(audits.map((a) => a.action)).toEqual(["create"]);
    const detail = await AppDbHandlers["appdb/queryAudit/get"]({
      queryId: saved.id,
      auditId: audits[0].id,
    });
    expect(detail.values.text).toBe("edited");
  });

  it("returns snapshot values and previousAuditId from get", async () => {
    const saved = await AppDbHandlers["appdb/query/save"]({
      obj: newQuery({ text: "select 1" }),
    });
    await AppDbHandlers["appdb/query/save"]({
      obj: { ...saved, text: "select 12" },
    });

    const audits = await listAudits(saved.id);
    const latest = await AppDbHandlers["appdb/queryAudit/get"]({
      queryId: saved.id,
      auditId: audits[0].id,
    });

    expect(latest.values.text).toBe("select 12");
    expect(latest.previousAuditId).toBe(audits[1].id);
  });

  it("restores a prior revision and records a new audit", async () => {
    const saved = await AppDbHandlers["appdb/query/save"]({
      obj: newQuery({ text: "v1" }),
    });
    await AppDbHandlers["appdb/query/save"]({
      obj: { ...saved, text: "v2" },
    });

    const audits = await listAudits(saved.id);
    const createAudit = audits.find((a) => a.action === "create");

    await AppDbHandlers["appdb/queryAudit/restore"]({
      queryId: saved.id,
      auditId: createAudit.id,
    });

    const fromDb = await FavoriteQuery.findOne({
      select: ["text"],
      where: { id: saved.id },
    });
    expect(fromDb.text).toBe("v1");

    const after = await listAudits(saved.id);
    expect(after).toHaveLength(3);
    expect(after[0].action).toBe("update");
  });

  it("restores both title and text from the selected revision", async () => {
    const saved = await AppDbHandlers["appdb/query/save"]({
      obj: newQuery({ title: "A", text: "x" }),
    });
    // Change only the title (rev2), then only the text (rev3).
    await saveQuery({ ...saved, title: "B", text: "x" });
    await saveQuery({ ...saved, title: "B", text: "y" });

    const audits = await listAudits(saved.id);
    // rev2 set title to "B" but stored null for text (unchanged then).
    const target = audits.find((a) => a.revision === 2);

    await AppDbHandlers["appdb/queryAudit/restore"]({
      queryId: saved.id,
      auditId: target.id,
    });

    const fromDb = await FavoriteQuery.findOne({
      select: ["title", "text"],
      where: { id: saved.id },
    });
    expect(fromDb.title).toBe("B");
    // text wasn't recorded at rev2, so it inherits from rev1.
    expect(fromDb.text).toBe("x");
  });

  it("deletes audits when the query is removed", async () => {
    const saved = await AppDbHandlers["appdb/query/save"]({ obj: newQuery() });
    await AppDbHandlers["appdb/query/save"]({
      obj: {
        ...saved,
        text: "changed",
      },
    });
    await expect(QueryAudit.count()).resolves.toBeGreaterThan(0);

    await AppDbHandlers["appdb/query/remove"]({ obj: saved });

    await expect(QueryAudit.count()).resolves.toBe(0);
  });
});
