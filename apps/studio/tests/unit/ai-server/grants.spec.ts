import { findConnectionGrant, isConnectionAllowed, isQueryAllowed, workspaceFilter } from "@commercial/backend/ai-server/grants";
import { AiServerGrants } from "@/common/interfaces/IAiServer";

const grants: AiServerGrants = {
  connections: [
    { connectionId: 1, readOnly: true },
    { connectionId: 2, readOnly: false, maxRows: 50 },
  ],
  queries: [42, 99],
  workspaceIds: [],
};

describe("ai-server/grants helpers", () => {
  it("isConnectionAllowed", () => {
    expect(isConnectionAllowed(grants, 1)).toBe(true);
    expect(isConnectionAllowed(grants, 5)).toBe(false);
  });

  it("findConnectionGrant returns the grant or null", () => {
    expect(findConnectionGrant(grants, 2)).toEqual({ connectionId: 2, readOnly: false, maxRows: 50 });
    expect(findConnectionGrant(grants, 5)).toBeNull();
  });

  it("isQueryAllowed", () => {
    expect(isQueryAllowed(grants, 42)).toBe(true);
    expect(isQueryAllowed(grants, 7)).toBe(false);
  });

  it("workspaceFilter returns null for empty list (= no filter)", () => {
    expect(workspaceFilter(grants)).toBeNull();
    expect(workspaceFilter({ ...grants, workspaceIds: [3, 4] })).toEqual([3, 4]);
  });

  it("empty grants block everything", () => {
    const empty: AiServerGrants = { connections: [], queries: [], workspaceIds: [] };
    expect(isConnectionAllowed(empty, 1)).toBe(false);
    expect(isQueryAllowed(empty, 1)).toBe(false);
  });
});
