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
import "scrollyfills";

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
  loadingColumns: boolean;
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
      generated: false,
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
          expanded: !this.generated
            ? this.defaultSchema === schema.schema
            : this.items.findIndex(
                (item: Item) => item.key === key && item.expanded
              ) >= 0,
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
            expanded: this.items.findIndex(
              (item: Item) => item.key === key && item.expanded
            ) >= 0,
            hidden: this.hiddenEntities.includes(table),
            contextMenu: this.tableMenuOptions,
            parent: schemaItem,
            level: noFolder ? 0 : 1,
            pinned: this.pins.find((pin: PinnedEntity) => pin.entity === table),
            loadingColumns: false,
          });
        });
        schema.routines.forEach((routine: Routine) => {
          const key = entityId(schema.schema, routine);
          items.push({
            entity: routine,
            key,
            type: "routine",
            expanded: this.items.findIndex(
              (item: Item) => item.key === key && item.expanded
            ) >= 0,
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
      this.generated = true;
    },
    generateDisplayItems() {
      this.displayItems = this.items.filter((item: Item) => {
        if (item.type === "schema") return !item.hidden && !item.skipDisplay;
        return !item.hidden && !item.parent.hidden && item.parent.expanded;
      });
    },
    updateTableColumnsInRange(whenEmpty = false) {
      const range = this.$refs.vList.range;

      const visibleItems: Item[] = this.displayItems.slice(
        range.start,
        range.end + 1
      );

      for (const item of visibleItems) {
        if (!item.expanded) continue;
        if (item.type !== "table") continue;
        if (whenEmpty && item.entity.columns?.length) continue;
        if (item.loadingColumns) continue;

        item.loadingColumns = true
        this.$nextTick(async () => {
          await this.$store.dispatch("updateTableColumns", item.entity);
          item.loadingColumns = false
        })
      }
    },
    handleExpand(_: Event, item: Item) {
      item.expanded = !item.expanded;
      if (item.expanded && item.type === "table") {
        item.loadingColumns = true
        this.$nextTick(async () => {
          await this.$store.dispatch("updateTableColumns", item.entity);
          item.loadingColumns = false
        })
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
    handleToggleExpandedAll(expand?: boolean) {
      if (typeof expand === "undefined") {
        expand = false;
      }
      this.items.forEach((item: Item) => {
        item.expanded = expand;
      });
      this.generateDisplayItems();
      if (expand) {
        this.$nextTick(() => {
          this.updateTableColumnsInRange();
        })
      }
    },
    handleTogglePinned(entity: Entity, pinned?: boolean) {
      const item = this.items.find((item: Item) => item.entity === entity);
      if (typeof pinned === "undefined") {
        pinned = !item.pinned;
      }
      item.pinned = !item.pinned;
    },
    handleScrollEnd() {
      this.updateTableColumnsInRange(true);
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
          handler: this.handleToggleExpandedAll,
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
    this.registerHandlers(this.rootBindings);
    this.$nextTick(() => this.resizeObserver.observe(this.$refs.vList.$el));
    this.$refs.vList.$el.addEventListener("scrollend", this.handleScrollEnd);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    this.resizeObserver.disconnect();
    this.$refs.vList.$el.removeEventListener("scrollend", this.handleScrollEnd);
  },
});
</script>
