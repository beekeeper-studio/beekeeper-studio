<template>
  <virtual-list
    ref="vList"
    class="virtual-table-list list-body"
    :class="{ 'list-body-empty': displayItems.length === 0 }"
    :data-key="'key'"
    :data-sources="displayItems"
    :data-component="itemComponent"
    :estimate-size="estimateItemHeight"
    :keeps="keeps"
    :extra-props="{ onExpand: handleExpand, onPin: handlePin, onDblClick: handleDblClick, onContextMenu: handleContextMenu, enablePinning }"
  />
</template>

<script lang="ts">
/*

In some cases, there are databases that have over 1000 tables or even much
more. Without optimizing the entity list, it can be very slow.

This component will render the items that are visible. Items that are outside
the viewport are destroyed. So all the states that need to be persistent
should be stored here instead of the item component.

*/

import { Item, TableItem } from "./models";
import { Entity } from "../types"
import { createTreeItems, ItemStateType } from "./treeItems";

import _ from "lodash";
import Vue, { PropType } from "vue";
import ItemComponent from "./Item.vue";
import VirtualList from "vue-virtual-scroll-list";
import { shouldRequestColumns } from "../../utils/entity";
import { idOf } from "./treeItems";

import * as globals from "../../utils/constants";
import "scrollyfills";

export default Vue.extend({
  components: { VirtualList },
  props: {
    entities: Array as PropType<Entity[]>,
    hiddenEntities: Array as PropType<Entity[]>,
    pinnedEntities: Array as PropType<Entity[]>,
    enablePinning: Boolean,
    expandAll: Number,
    collapseAll: Number,
  },
  data() {
    return {
      items: [],
      displayItems: [],
      itemComponent: ItemComponent,
      estimateItemHeight: globals.entityListItemHeight, // height of collapsed item
      keeps: 30,
      itemStates: {},
      pinnedItems: [],
    };
  },
  methods: {
    // TODO move this to a file and test
    generateDisplayItems() {
      let totalHeight = 0;
      const displayItems: Item[] = [];
      const items: Item[] = this.items;

      for (const item of items) {
        // Skip rendering routines in minimal mode
        // if (this.$store.getters.minimalMode && item.type === 'routine') {
        //   continue;
        // }

        const isItemHidden = this.hiddenEntities.find((entity: Entity) => {
          if (idOf(entity) === idOf(item.entity)) {
            return true
          }
          if (item.parent && idOf(entity) === idOf(item.parent.entity)) {
            return true
          }
          return false
        })

        if (!isItemHidden && item.parent.expanded) {
          displayItems.push(item);

          // Summarizing the total height of all list items to get the average height

          totalHeight += globals.entityListItemHeight; // height of list item

          if (item.expanded) {
            if (item.type === "table") {
              const cols = item.entity.columns?.length ?? 1;
              totalHeight += cols * 20.29; // plus column height when expanded
            } else if (item.type === "routine") {
              const params = item.entity.routineParams?.length ?? 0;
              totalHeight += params * 20.29;
            }
          }
        }
      }

      if (displayItems.length > 0) {
        this.estimateItemHeight = totalHeight / displayItems.length;
      } else {
        this.estimateItemHeight = globals.entityListItemHeight;
      }
      this.displayItems = displayItems;
    },
    updateTableColumnsInRange() {
      const range = this.$refs.vList.range;
      const items = []

      for (let i = range.start; i < range.end + 1; i++) {
        const item: Item = this.displayItems[i];
        if (!item.expanded) continue;
        if (item.type !== "table") continue;
        if (typeof item.entity.columns !== 'undefined') continue;

        items.push(item)
      }

      if (items.length) {
        this.$emit("request-items-columns", items)
      }
    },
    updateItemState(item: Item, stateType: ItemStateType) {
      if (!this.itemStates[item.key]) {
        this.$set(this.itemStates, item.key, { expanded: item.expanded });
      } else {
        this.itemStates[item.key][stateType] = item[stateType]
      }
    },
    handleExpand(_: Event, item: Item) {
      item.expanded = !item.expanded;
      this.updateItemState(item, 'expanded')
      if (item.expanded && item.type === "table" &&  shouldRequestColumns(item.entity)) {
        this.$emit("request-items-columns", [item])
      }
      this.generateDisplayItems();
      this.$emit("expand", item);
    },
    handlePin(_: Event, item: TableItem) {
      this.$emit("pin", item.entity);
    },
    handleDblClick(e: Event, item: Item) {
      this.$emit("dblclick", e, item);
    },
    handleContextMenu(e: Event, item: Item) {
      this.$emit("contextmenu", e, item);
    },
    handleToggleExpandedAll(expand?: boolean) {
      if (typeof expand === "undefined") {
        expand = false;
      }
      this.items.forEach((item: Item) => {
        item.expanded = expand;
        this.updateItemState(item, 'expanded')
      });
      this.generateDisplayItems();
      this.$emit("expand-all", expand);
      if (expand) {
        this.$nextTick(() => {
          this.updateTableColumnsInRange();
        });
      }
    },
    handleTogglePinned(entity: Entity, pinned?: boolean) {
      const item = this.items.find((item: Item) => idOf(item.entity) === idOf(entity));
      if (typeof pinned === "undefined") {
        pinned = !item.pinned;
      }
      item.pinned = !item.pinned;
    },
    handleScrollEnd() {
      this.updateTableColumnsInRange();
    },
  },
  computed: {
    resizeObserver() {
      return new ResizeObserver(() => {
        const vListHeight = this.$refs.vList.$el.clientHeight;
        const minKeeps = Math.ceil(vListHeight / this.estimateItemHeight);
        this.keeps = Math.max(30, Math.ceil(minKeeps * 1.3));
      });
    },
  },
  watch: {
    entities: {
      handler() {
        this.items = createTreeItems(this.entities, this.itemStates)
        this.generateDisplayItems();
      },
      immediate: true,
    },
    hiddenEntities() {
      this.generateDisplayItems();
    },
    pinnedEntities() {
      this.pinnedItems.forEach((item: Item) => {
        item.pinned = false
      })

      const pinnedItems = []
      this.pinnedEntities.forEach((entity: Entity) => {
        const item = this.items.find((item: Item) => idOf(item.entity) === idOf(entity));
        item.pinned = true;
        pinnedItems.push(item)
      })
      this.pinnedItems = pinnedItems

    },
    expandAll() {
      this.handleToggleExpandedAll(true)
    },
    collapseAll() {
      this.handleToggleExpandedAll(false)
    },
  },
  mounted() {
    this.$nextTick(() => this.resizeObserver.observe(this.$refs.vList.$el));
    this.$refs.vList.$el.addEventListener("scrollend", this.handleScrollEnd);
  },
  beforeDestroy() {
    this.resizeObserver.disconnect();
    this.$refs.vList.$el.removeEventListener("scrollend", this.handleScrollEnd);
  },
});
</script>
