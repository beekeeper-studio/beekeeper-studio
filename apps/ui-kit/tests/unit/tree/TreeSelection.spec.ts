import Vue from "vue";
import Tree from "../../../lib/components/tree/Tree.vue";
import { ItemNode } from "../../../lib/components/tree/types";

function itemNode(id: number): ItemNode {
  return {
    id: `item-${id}`,
    parentId: null,
    type: "item",
    name: `Item ${id}`,
    draggable: true,
  };
}

type TreeVm = InstanceType<typeof Tree> & {
  selectionAnchorId: ItemNode["id"] | null;
  handleNodeClick: (node: ItemNode) => void;
  handleItemSelectionClick: (node: ItemNode, event: MouseEvent) => void;
};

function mountTree(items: ItemNode[]) {
  const parent = new Vue({
    data() {
      return {
        folders: [] as unknown[],
        items,
        expandedIds: [] as string[],
        selectedIds: [] as ItemNode["id"][],
      };
    },
    render(h) {
      return h(Tree, {
        props: {
          folders: this.folders,
          items: this.items,
          expandedIds: this.expandedIds,
          selectedIds: this.selectedIds,
        },
        on: {
          "update:selectedIds": (ids: ItemNode["id"][]) => {
            this.selectedIds = ids;
          },
        },
        scopedSlots: {
          item: ({ node }: { node: ItemNode }) =>
            h("input", { attrs: { type: "checkbox", "data-id": node.id } }),
        },
      });
    },
  }).$mount();

  return {
    parent,
    tree: parent.$children[0] as TreeVm,
  };
}

function shiftClick(): MouseEvent {
  return { shiftKey: true } as MouseEvent;
}

describe("Tree item range selection", () => {
  const items = [itemNode(1), itemNode(2), itemNode(3)];

  it("selects a visible range after a normal click then shift+click", () => {
    const { parent, tree } = mountTree(items);

    tree.handleNodeClick(items[0]);
    tree.handleItemSelectionClick(items[2], shiftClick());

    expect(parent.selectedIds).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("shift+clicks the last item with no prior click selects all visible items", () => {
    const { parent, tree } = mountTree(items);

    tree.handleItemSelectionClick(items[2], shiftClick());

    expect(parent.selectedIds).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("uses a newly checked item as the range anchor", async () => {
    const { parent, tree } = mountTree(items);

    parent.selectedIds = ["item-1"];
    await Vue.nextTick();
    expect(tree.selectionAnchorId).toBe("item-1");

    tree.handleItemSelectionClick(items[2], shiftClick());

    expect(parent.selectedIds).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("prevents a nested checkbox from unchecking the shift-clicked item", () => {
    const { parent } = mountTree(items);
    const checkbox = parent.$el.querySelector(
      'input[data-id="item-3"]'
    ) as HTMLInputElement;

    const event = new MouseEvent("click", {
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    checkbox.dispatchEvent(
      new MouseEvent("mousedown", {
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    checkbox.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(parent.selectedIds).toEqual(["item-1", "item-2", "item-3"]);
    expect(checkbox.checked).toBe(false);
  });
});
