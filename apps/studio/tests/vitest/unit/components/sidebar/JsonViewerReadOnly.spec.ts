import { describe, it, expect } from "vitest";
/**
 * The JSON viewer's text editor is read-only when nothing in it can be
 * edited, which hides Replace / Replace All in the search panel (e.g. for
 * query results).
 */
import JsonViewer from "@/components/sidebar/JsonViewer.vue";

const readOnly = (JsonViewer as any).options.computed.readOnly;

describe("JsonViewer readOnly", () => {
  it("is read-only when there are no editable ranges (query results)", () => {
    expect(readOnly.call({ editableRanges: [] })).toBe(true);
  });

  it("is editable when at least one value can be edited (table view)", () => {
    const range = { id: "name", from: { line: 1, ch: 10 }, to: { line: 1, ch: 15 } };
    expect(readOnly.call({ editableRanges: [range] })).toBe(false);
  });
});
