import { describe, it, expect, afterEach } from "vitest";
import Vue from "vue";
import { openMenu } from "@beekeeperstudio/ui-kit";

async function open(heading?: string, extra = {}) {
  openMenu({
    heading,
    event: new MouseEvent("click"),
    options: [{ label: "order_items (order_id)", handler: () => {} }],
    ...extra,
  });
  await Vue.nextTick();
  await Vue.nextTick();
}

describe("context menu heading and descriptions", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the heading above the items, outside the clickable items", async () => {
    await open("Referenced by");

    const heading = document.querySelector(".BksContextMenu-heading");
    expect(heading?.textContent).toBe("Referenced by");
    expect(heading?.getAttribute("role")).toBe("presentation");
    expect(heading?.classList.contains("BksContextMenu-item")).toBe(false);
    expect(document.querySelectorAll(".BksContextMenu-item")).toHaveLength(1);
    expect(document.querySelector(".BksContextMenu-list")?.getAttribute("aria-label")).toBe("Referenced by");
  });

  it("renders an item description as plain text under the label", async () => {
    await open(undefined, {
      options: [{ label: "order_items", description: "<b>order_id</b>", handler: () => {} }],
    });

    const item = document.querySelector(".BksContextMenu-item");
    expect(item?.classList.contains("BksContextMenu-item-has-description")).toBe(true);
    expect(item?.querySelector(".BksContextMenu-item-label")?.textContent).toBe("order_items");
    const description = item?.querySelector(".BksContextMenu-item-description");
    expect(description?.textContent).toBe("<b>order_id</b>");
    expect(description?.querySelector("b")).toBeNull();
  });

  it("adds the menu class to the menu", async () => {
    await open("Referenced by", { menuClass: "referenced-by-menu" });

    expect(document.querySelector(".BksContextMenu-list")?.classList.contains("referenced-by-menu")).toBe(true);
  });

  it("has no heading unless one is given", async () => {
    await open();

    expect(document.querySelector(".BksContextMenu-heading")).toBeNull();
    expect(document.querySelector(".BksContextMenu-list")?.hasAttribute("aria-label")).toBe(false);
  });
});
