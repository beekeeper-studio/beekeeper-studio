import { describe, it, expect } from "vitest";
import { toHtmlTable } from "@/common/utils";

describe("toHtmlTable", () => {
  it("converts headers and rows to an HTML table string with proper escaping", () => {
    const headers = ["ID", "Name & Role", "Active"];
    const rows = [
      [1, "Alice <Admin>", true],
      [2, "Bob & \"Partner\"", false],
    ];

    const html = toHtmlTable(headers, rows);
    expect(html).toBe(
      "<table><thead><tr><th>ID</th><th>Name &amp; Role</th><th>Active</th></tr></thead><tbody><tr><td>1</td><td>Alice &lt;Admin&gt;</td><td>true</td></tr><tr><td>2</td><td>Bob &amp; &quot;Partner&quot;</td><td>false</td></tr></tbody></table>"
    );
  });

  it("handles null or undefined headers without creating thead", () => {
    const rows = [
      ["x", "y"],
      ["1", "2"],
    ];

    const html = toHtmlTable(null, rows);
    expect(html).toBe("<table><tbody><tr><td>x</td><td>y</td></tr><tr><td>1</td><td>2</td></tr></tbody></table>");
  });

  it("handles null and undefined cell values by outputting empty td", () => {
    const rows = [[null, undefined, 42]];
    const html = toHtmlTable([], rows);
    expect(html).toBe("<table><tbody><tr><td></td><td></td><td>42</td></tr></tbody></table>");
  });
});
