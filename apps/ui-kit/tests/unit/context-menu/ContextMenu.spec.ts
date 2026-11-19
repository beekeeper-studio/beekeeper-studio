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

  describe("calculatePosition", () => {
    const menuWidth = 200;
    const menuHeight = 400;

    beforeEach(() => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(800);
      vi.spyOn(window, "innerHeight", "get").mockReturnValue(600);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    function positionAt(pageX: number, pageY: number) {
      const { vm } = mount([{ id: "map", label: "Map", handler: vi.fn() }]);
      const menu = vm.$children[0] as any;
      menu.menuWidth = menuWidth;
      menu.menuHeight = menuHeight;
      return menu.calculatePosition({ pageX, pageY } as MouseEvent);
    }

    it("opens below and to the right of the cursor when there is room", () => {
      expect(positionAt(100, 100)).toEqual({ left: 98, top: 98 });
    });

    it("opens above the cursor when there is room above but not below", () => {
      expect(positionAt(100, 500)).toEqual({ left: 98, top: 102 });
    });

    // #5010: a menu taller than the room above the cursor was pushed past the top of the window
    it("keeps a menu that fits neither below nor above inside the window", () => {
      const { top } = positionAt(100, 300);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top + menuHeight).toBeLessThanOrEqual(600);
    });

    it("keeps a menu wider than the room on either side inside the window", () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(300);
      const { left } = positionAt(150, 100);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + menuWidth).toBeLessThanOrEqual(300);
    });

    it("pins a menu taller than the window to the top", () => {
      vi.spyOn(window, "innerHeight", "get").mockReturnValue(300);
      expect(positionAt(100, 200).top).toBe(0);
    });
  });
});
