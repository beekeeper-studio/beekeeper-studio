<template>
  <virtual-list
    ref="vList"
    class="list-body"
    :data-key="'key'"
    :data-sources="displayItems"
    :data-component="itemComponent"
    :estimate-size="itemHeight"
    :keeps="keeps"
    :extra-props="{ onExpand: handleExpand, onPin: handlePin }"
  ></virtual-list>
</template>

<script lang="ts">
/*

In some cases, there are databases that have over 1000 tables or even much
more. Without optimizing the table list, it can be very slow.

This component will render the items that are visible. Items that are outside
the viewport are destroyed. So all the states that need to be persistent
should be stored here instead of the item component.

*/

import Vue from "vue";
import { TableOrView, Routine } from "@/lib/db/models";
import TableListContextMenus from "@/mixins/TableListContextMenus";
import ItemComponent from "./Item.vue";
import VirtualList from "vue-virtual-scroll-list";
import { AppEvent } from "@/common/AppEvent";
import { mapGetters, mapState } from "vuex";
import { PinnedEntity } from "@/common/appdb/models/PinnedEntity";
import { entityId } from "@/common/utils";

type Entity = TableOrView | Routine | string;

type Item = SchemaItem | TableItem | RoutineItem;

interface BaseItem {
  type: "schema" | "table" | "routine";
  entity: Entity;
  key: string;
  expanded: boolean;
  hidden: boolean;
  contextMenu: any[];
  level: number;
}

interface SchemaItem extends BaseItem {
  type: "schema";
  entity: string;
  skipDisplay: boolean;
}

interface TableItem extends BaseItem {
  type: "table";
  entity: TableOrView;
  parent: SchemaItem;
  pinned: boolean;
}

interface RoutineItem extends BaseItem {
  type: "routine";
  entity: Routine;
  parent: SchemaItem;
  pinned: boolean;
}

export default Vue.extend({
  mixins: [TableListContextMenus],
  components: { VirtualList },
  data() {
    return {
      items: [],
      displayItems: [],
      itemComponent: ItemComponent,
      itemHeight: 22.8,
      keeps: 30,
      expandedItems: [],
    };
  },
  methods: {
    generateItems() {
      const items = [] as Item[];
      const noFolder = this.schemaTables.length === 1;
      this.schemaTables.forEach((schema: any) => {
        const key = entityId(schema.schema);
        const schemaItem: SchemaItem = {
          type: "schema",
          key,
          entity: schema.schema,
          expanded: this.expandedItems.includes(key),
          hidden: this.hiddenSchemas.includes(schema.schema),
          contextMenu: this.schemaMenuOptions,
          skipDisplay: noFolder,
          level: 0,
        };
        items.push(schemaItem);
        schema.tables.forEach((table: TableOrView) => {
          const key = entityId(schema.schema, table);
          items.push({
            type: "table",
            key,
            entity: table,
            expanded: this.expandedItems.includes(key),
            hidden: this.hiddenEntities.includes(table),
            contextMenu: this.tableMenuOptions,
            parent: schemaItem,
            level: noFolder ? 0 : 1,
            pinned: this.pins.find((pin: PinnedEntity) => pin.entity === table),
          });
        });
        schema.routines.forEach((routine: Routine) => {
          const key = entityId(schema.schema, routine);
          items.push({
            entity: routine,
            key: key,
            type: "routine",
            expanded: this.expandedItems.includes(key),
            hidden: this.hiddenEntities.includes(routine),
            contextMenu: this.routineMenuOptions,
            parent: schemaItem,
            level: noFolder ? 0 : 1,
            pinned: this.pins.find(
              (pin: PinnedEntity) => pin.entity === routine
            ),
          });
        });
      });
      this.items = items;
    },
    generateDisplayItems() {
      this.displayItems = this.items.filter((item: Item) => {
        if (item.type === "schema") return !item.hidden && !item.skipDisplay;
        return !item.hidden && !item.parent.hidden && item.parent.expanded;
      });
    },
    handleExpand(_: Event, item: Item) {
      const expanded = !this.expandedItems.includes(item.key);
      item.expanded = expanded;
      if (expanded) {
        this.expandedItems.push(item.key);
      } else {
        this.expandedItems.splice(this.expandedItems.indexOf(item.key), 1);
      }
      if (expanded && item.type === "table") {
        this.$store.dispatch("updateTableColumns", item.entity);
      }
      this.generateDisplayItems();
    },
    handlePin(_: Event, item: TableItem) {
      this.trigger(AppEvent.togglePinTableList, item.entity, !item.pinned);
    },
    handleToggleHidden(
      entity: TableOrView | Routine | string,
      hidden?: boolean
    ) {
      const item = this.items.find((item: Item) => item.entity === entity);
      if (typeof hidden === "undefined") {
        hidden = !item.hidden;
      }
      item.hidden = hidden;
      this.generateDisplayItems();
    },
    handleToggleExpanded(expand?: boolean) {
      if (typeof expand === "undefined") {
        expand = false;
      }
      this.items.forEach((item: Item) => {
        item.expanded = expand;
      });
      this.generateDisplayItems();
    },
    handleTogglePinned(entity: Entity, pinned?: boolean) {
      const item = this.items.find((item: Item) => item.entity === entity);
      if (typeof pinned === "undefined") {
        pinned = !item.pinned;
      }
      item.pinned = !item.pinned;
    },
  },
  computed: {
    resizeObserver() {
      return new ResizeObserver(() => {
        const vListHeight = this.$refs.vList.$el.clientHeight;
        const minKeeps = Math.ceil(vListHeight / this.itemHeight);
        this.keeps = Math.max(30, Math.ceil(minKeeps * 1.3));
      });
    },
    rootBindings() {
      return [
        { event: AppEvent.toggleHideSchema, handler: this.handleToggleHidden },
        { event: AppEvent.toggleHideEntity, handler: this.handleToggleHidden },
        {
          event: AppEvent.toggleExpandTableList,
          handler: this.handleToggleExpanded,
        },
        {
          event: AppEvent.togglePinTableList,
          handler: this.handleTogglePinned,
        },
      ];
    },
    ...mapGetters({
      defaultSchema: "defaultSchema",
      schemaTables: "schemaTables",
      hiddenEntities: "hideEntities/databaseEntities",
      hiddenSchemas: "hideEntities/databaseSchemas",
    }),
    ...mapState("pins", ["pins"]),
  },
  watch: {
    schemaTables() {
      this.generateItems();
      this.generateDisplayItems();
    },
  },
  mounted() {
    this.expandedItems = [entityId(this.defaultSchema)];
    this.registerHandlers(this.rootBindings);
    this.$nextTick(() => this.resizeObserver.observe(this.$refs.vList.$el));
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    this.resizeObserver.disconnect();
  },
});
</script>
