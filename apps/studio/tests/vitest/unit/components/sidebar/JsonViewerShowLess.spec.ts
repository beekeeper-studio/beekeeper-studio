import { describe, it, expect, vi } from "vitest";
import { createShowLessTextDecoration } from "@/lib/data/jsonViewer";

describe("JsonViewer Show Less widget (#4843)", () => {
  it("creates a widget decoration with Show less button that fires onClick", () => {
    const onClick = vi.fn();
    const decoration: any = createShowLessTextDecoration(onClick);

    expect(decoration).toBeDefined();
    expect(decoration.widget).toBeDefined();

    const dom = decoration.widget.toDOM();
    expect(dom.classList.contains("show-less-wrapper")).toBe(true);

    const button = dom.querySelector(".show-less");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Show less");

    const event = new MouseEvent("click");
    dom.dispatchEvent(event);
    expect(onClick).toHaveBeenCalledTimes(1);

    // destroy cleans up listener
    decoration.widget.destroy(dom);
  });
});
