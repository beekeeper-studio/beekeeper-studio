import Vue from "vue";
import ContextMenu from "../../../lib/components/context-menu/ContextMenu.vue";
import { divider, sectionLabel, MenuItem } from "../../../lib/components/context-menu/menu";

const target = { id: 1 };

function mount(options: MenuItem[]) {
  const event = new MouseEvent("contextmenu", { clientX: 10, clientY: 10 });
  const vm = new Vue({
    render: (h) => h(ContextMenu, { props: { options, event, item: target } }),
  }).$mount();
  document.body.appendChild(vm.$el);
  return { vm, rows: Array.from(vm.$el.querySelectorAll("li")) as HTMLElement[] };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ContextMenu", () => {
  it("renders a section label as a heading, not an item", () => {
    const { rows } = mount([
      divider,
      sectionLabel("Plugins"),
      { id: "map", label: "Map", leadingIcon: "map", handler: vi.fn() },
    ]);

    const label = rows[1];
    expect(label.textContent?.trim()).toBe("Plugins");
    expect(label.getAttribute("role")).toBe("presentation");
    expect(label.classList.contains("BksContextMenu-section-label")).toBe(true);
    expect(rows[2].getAttribute("role")).toBe("menuitem");
  });

  it("renders a leading icon before the label", () => {
    const { rows } = mount([{ id: "map", label: "Map", leadingIcon: "map", handler: vi.fn() }]);

    const icon = rows[0].querySelector(".BksContextMenu-item-leading-icon");
    expect(icon?.textContent?.trim()).toBe("map");
    expect(icon?.nextElementSibling?.classList.contains("BksContextMenu-item-label")).toBe(true);
  });

  it("calls an item's handler with the event, the target and the item", () => {
    const handler = vi.fn();
    const option = { id: "map", label: "Map", handler };
    const { rows } = mount([option]);

    rows[0].click();

    expect(handler).toHaveBeenCalledTimes(1);
    const [event, item, clicked] = handler.mock.calls[0];
    expect(event).toBeInstanceOf(MouseEvent);
    expect(item).toBe(target);
    expect(clicked).toEqual(option);
  });

  it("ignores clicks on labels, dividers and disabled items", async () => {
    const handler = vi.fn();
    const { vm, rows } = mount([
      sectionLabel("Plugins"),
      divider,
      { id: "none", label: "No plugins…", disabled: true, handler },
    ]);
    const closed = vi.fn();
    vm.$children[0].$on("close", closed);

    rows.forEach((row) => row.click());
    await Vue.nextTick();

    expect(handler).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });
});
