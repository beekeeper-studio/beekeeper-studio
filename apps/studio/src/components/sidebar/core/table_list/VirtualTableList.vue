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
import Vue from "vue";
import { TableOrView, Routine } from "@/lib/db/models";
import TableListContextMenus from "@/mixins/TableListContextMenus";
import ItemComponent from "./Item.vue";
import VirtualList from "vue-virtual-scroll-list";
import { AppEvent } from "@/common/AppEvent";
import { mapGetters, mapState } from "vuex";
import { PinnedEntity } from '@/common/appdb/models/PinnedEntity'

type Entity = TableOrView | Routine | string;

type Item = SchemaItem | TableItem;

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
  type: "table" | "routine";
  entity: TableOrView | Routine;
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
    };
  },
  methods: {
    generateItems() {
      const items = [] as Item[];
      const noFolder = this.schemaTables.length === 1;
      this.schemaTables.forEach((schema: any) => {
        const schemaItem: SchemaItem = {
          type: "schema",
          key: schema.schema,
          entity: schema.schema,
          expanded: true,
          hidden: this.hiddenSchemas.includes(schema.schema),
          contextMenu: this.schemaMenuOptions,
          skipDisplay: noFolder,
          level: 0,
        };
        items.push(schemaItem);
        schema.tables.forEach((table: TableOrView) => {
          items.push({
            type: "table",
            key: `${schema.schema}.${table.name}.table`,
            entity: table,
            expanded: false,
            hidden: this.hiddenEntities.includes(table),
            contextMenu: this.tableMenuOptions,
            parent: schemaItem,
            level: noFolder ? 0 : 1,
            pinned: this.pins.find((pin: PinnedEntity) => pin.entity === table),
          });
        });
        schema.routines.forEach((routine: Routine) => {
          items.push({
            entity: routine,
            key: `${schema.schema}.${routine.name}.routine`,
            type: "routine",
            expanded: false,
            hidden: this.hiddenEntities.includes(routine),
            contextMenu: this.routineMenuOptions,
            parent: schemaItem,
            level: noFolder ? 0 : 1,
            pinned: this.pins.find((pin: PinnedEntity) => pin.entity === routine),
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
      item.expanded = !item.expanded;
      this.generateDisplayItems();
    },
    handlePin(_: Event, item: TableItem) {
      item.pinned = !item.pinned;
      if (item.pinned) {
        this.$store.dispatch('pins/add', item.entity)
        if (item.type === 'table') {
          this.$store.dispatch('updateTableColumns', item.entity)
        }
      } else {
        this.$store.dispatch('pins/remove', item.entity)
      }
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
      ];
    },
    ...mapGetters({
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
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    this.resizeObserver.disconnect();
  },
});
</script>
