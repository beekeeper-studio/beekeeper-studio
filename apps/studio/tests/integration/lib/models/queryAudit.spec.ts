import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { AppDbHandlers } from "@/handlers/appDbHandlers";
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { QueryAudit } from "@/common/appdb/models/QueryAudit";
import migration from "@/migration/20260526_create_query_audits";

async function createQuery(
  title: string,
  text: string
): Promise<FavoriteQuery> {
  const query = FavoriteQuery.create();
  query.title = title;
  query.text = text;
  query.excerpt = text;
  await query.save();
  return query;
}

/** Fake the date by 1 hour in the future */
function fastForward(date: Date) {
  return new Date(date.getTime() + 60 * 60 * 1000);
}

describe("QueryAudit", () => {
  beforeAll(async () => {
    await TestOrmConnection.connect();
    const runner = TestOrmConnection.connection.connection.createQueryRunner();
    await migration.run(runner);
    await runner.release();
  });

  afterAll(async () => {
    await TestOrmConnection.disconnect();
  });

  beforeEach(async () => {
    const runner = TestOrmConnection.connection.connection.createQueryRunner();
    await runner.query("DELETE FROM query_audit;");
    await runner.query("DELETE FROM favorite_query;");
    await runner.release();
  });

  it("records a create audit when a new query is saved", async () => {
    await createQuery("Test", "SELECT 1;");
    const audits = await QueryAudit.find();
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("create");
  });

  it("records an update audit when title or text changes", async () => {
    const query = await createQuery("Test", "SELECT 1;");
    query.text = "SELECT 2;";
    await query.save();
    const audits = await QueryAudit.find({ select: ["action", "text"] });
    expect(audits[0]).toMatchObject({ action: "create", text: "SELECT 1;" });
    expect(audits[1]).toMatchObject({ action: "update", text: "SELECT 2;" });
  });

  it("stores null for fields that did not change", async () => {
    // Oldest
    const query = await createQuery("Test", "SELECT 1;");

    // Middle
    query.text = "SELECT 2;";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    // Latest
    query.title = "Renamed";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    const audits = await QueryAudit.find({
      select: ["action", "title", "text", "createdAt"],
    });

    const [latest, middle, oldest] = audits;

    expect(latest.title).toBe("Renamed");
    expect(latest.text).toBeNull();

    expect(middle.title).toBeNull();
    expect(middle.text).toBe("SELECT 2;");

    expect(oldest.title).toBe("Test");
    expect(oldest.text).toBe("SELECT 1;");
  });

  it("does not record an audit when nothing relevant changed", async () => {
    const query = await createQuery("Test", "SELECT 1;");
    query.position = 5;
    await query.save();
    const audits = await QueryAudit.count({
      where: { favoriteQueryId: query.id },
    });
    expect(audits).toBe(1);
  });

  it("returns snapshot values and previousAuditId from get", async () => {
    const query = await createQuery("Test", "SELECT 1;");
    query.text = "SELECT 12;";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    const audits = await QueryAudit.find();
    const latest = await audits[0].fetchDetail();

    expect(latest.values.text).toBe("SELECT 12;");
    expect(latest.previousAuditId).toBe(audits[1].id);
  });

  it("restores a prior version and records a new audit", async () => {
    const query = await createQuery("Test", "SELECT 1;");
    query.text = "SELECT 2;";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    const createAudit = await QueryAudit.findOne({
      where: { favoriteQueryId: query.id, action: "create" },
    });
    await createAudit.restore(fastForward(query.updatedAt));

    const updated = await FavoriteQuery.findOne({
      select: ["text"],
      where: { id: query.id },
    });
    expect(updated.text).toBe("SELECT 1;");

    const audits = await QueryAudit.find();
    expect(audits).toHaveLength(3);
    expect(audits.map((a) => a.action)).toStrictEqual(["update", "update", "create"]);
  });

  it("restores both title and text from the selected revision", async () => {
    // audits[4]
    const query = await createQuery("A", "x");

    // audits[3]
    query.title = "B";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    // audits[2]
    query.text = "y";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    // audits[1]
    query.title = "C";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    // audits[0]
    query.text = "z";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    const audits = await QueryAudit.find();
    await audits[2].restore();

    const { title, text } = await FavoriteQuery.findOne({
      select: ["title", "text"],
      where: { id: query.id },
    });
    expect(title).toBe("B");
    expect(text).toBe("y");
  });

  it("deletes audits when the query is removed", async () => {
    const query = await createQuery("Test", "SELECT 1;");
    query.text = "changed";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    await expect(QueryAudit.count()).resolves.toBeGreaterThan(0);
    await query.remove();
    await expect(QueryAudit.count()).resolves.toBe(0);
  });
});

describe("Query Audit migration", () => {
  beforeAll(async () => {
    await TestOrmConnection.connect();
  });

  afterAll(async () => {
    await TestOrmConnection.disconnect();
  });

  it("records a create from current state when a query has no history yet", async () => {
    const query = await createQuery("Test", "SELECT 1;");

    // Run migration
    const runner = TestOrmConnection.connection.connection.createQueryRunner();
    await migration.run(runner);
    await runner.release();

    // After migration, we should have a single audit
    await expect(QueryAudit.count()).resolves.toBe(1);

    query.text = "edited";
    query.updatedAt = fastForward(query.updatedAt);
    await query.save();

    const [latest, oldest] = await QueryAudit.find();
    expect(latest.action).toBe("update");
    expect(oldest.action).toBe("create");

    const detail = await latest.fetchDetail();
    expect(detail.values.text).toBe("edited");
  });
})

