import {
  ENTITY_DRAG_MIME,
  DraggedEntity,
  setEntityDragData,
  getEntityDragData,
  hasEntityDragData,
} from "@/lib/dnd/entityDragData";

/** Minimal DataTransfer stand-in; jsdom's implementation is incomplete. */
function fakeDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  return {
    effectAllowed: "none",
    get types() {
      return Array.from(store.keys());
    },
    setData(type: string, value: string) {
      store.set(type, value);
    },
    getData(type: string) {
      return store.get(type) ?? "";
    },
  } as unknown as DataTransfer;
}

describe("entityDragData", () => {
  const entities: DraggedEntity[] = [
    { name: "users", schema: "public", entityType: "table" },
    { name: "user_view", entityType: "view" },
  ];

  it("round-trips entities through DataTransfer", () => {
    const dt = fakeDataTransfer();
    setEntityDragData(dt, entities);

    expect(hasEntityDragData(dt)).toBe(true);
    expect(getEntityDragData(dt)).toEqual(entities);
  });

  it("sets a text/plain fallback of entity names", () => {
    const dt = fakeDataTransfer();
    setEntityDragData(dt, entities);

    expect(dt.getData("text/plain")).toBe("users, user_view");
    expect(dt.effectAllowed).toBe("copyMove");
  });

  it("returns null when no entity data is present", () => {
    const dt = fakeDataTransfer();
    expect(hasEntityDragData(dt)).toBe(false);
    expect(getEntityDragData(dt)).toBeNull();
    expect(getEntityDragData(null)).toBeNull();
  });

  it("returns null when the payload is malformed", () => {
    const dt = fakeDataTransfer();
    dt.setData(ENTITY_DRAG_MIME, "not json");
    expect(getEntityDragData(dt)).toBeNull();
  });
});
