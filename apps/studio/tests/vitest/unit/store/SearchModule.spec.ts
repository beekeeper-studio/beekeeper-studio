import { describe, it, expect } from "vitest";
import { searchItems, IndexItem } from "@/store/modules/SearchModule";

describe("searchItems", () => {
  it("highlights fuzzy matches at their original positions #4294", () => {
    const items: IndexItem[] = [
      { title: "app.user_accounts", item: "a", type: "table", id: "a" },
      { title: "app.orders", item: "b", type: "table", id: "b" },
    ];

    const results = searchItems(items, "uacc");

    expect(results.map((r) => r.id)).toEqual(["a"]);
    expect(results[0].highlight).toBe("app.<strong>u</strong>ser_<strong>acc</strong>ounts");
  });
});
