import { capResults } from "@commercial/backend/ai-server/rowCapper";

const makeResult = (n: number, fields = ["a"]) => ({
  fields: fields.map((name) => ({ name })),
  rows: Array.from({ length: n }, (_, i) => ({ a: i })),
  rowCount: n,
});

describe("ai-server/rowCapper", () => {
  it("does nothing when under cap", () => {
    const out = capResults([makeResult(50)] as any, 100);
    expect(out.truncated).toBe(false);
    expect(out.totalRowCount).toBe(50);
    expect(out.rowCount).toBe(50);
    expect(out.results[0].rows).toHaveLength(50);
  });

  it("truncates and preserves totalRowCount", () => {
    const out = capResults([makeResult(2500)] as any, 1000);
    expect(out.truncated).toBe(true);
    expect(out.totalRowCount).toBe(2500);
    expect(out.rowCount).toBe(1000);
    expect(out.results[0].rows).toHaveLength(1000);
    expect((out.results[0] as any).truncated).toBe(true);
    expect((out.results[0] as any).totalRowCount).toBe(2500);
  });

  it("handles multi-resultset arrays", () => {
    const out = capResults([makeResult(10), makeResult(2000)] as any, 500);
    expect(out.truncated).toBe(true);
    expect(out.totalRowCount).toBe(2010);
    expect(out.rowCount).toBe(510);
    expect(out.results[0].rows).toHaveLength(10);
    expect(out.results[1].rows).toHaveLength(500);
  });

  it("handles missing rowCount", () => {
    const r = makeResult(5);
    delete (r as any).rowCount;
    const out = capResults([r] as any, 10);
    expect(out.totalRowCount).toBe(5);
  });

  it("handles empty/missing results", () => {
    expect(capResults([] as any, 100)).toMatchObject({ rowCount: 0, totalRowCount: 0, truncated: false });
    expect(capResults(null as any, 100)).toMatchObject({ rowCount: 0, totalRowCount: 0, truncated: false });
  });
});
