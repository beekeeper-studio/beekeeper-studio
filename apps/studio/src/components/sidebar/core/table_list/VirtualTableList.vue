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
    :extra-props="{ onExpand: handleExpand, onPin: handlePin }"
  />
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
import { entityId } from "@/common/utils";
import "scrollyfills";
import { TransportPinnedEntity } from "@/common/transport/TransportPinnedEntity";
import { indexColumnResults, matchColumnResults } from "@/lib/db/columnSearch";

type Entity = TableOrView | Routine | string;

type Item = SchemaItem | TableItem | RoutineItem;

interface BaseItem {
  type: "schema" | "table" | "routine" | "root";
  entity: Entity;
  key: string;
  expanded: boolean;
  hidden: boolean;
  contextMenu: any[];
  level: number;
  parent?: BaseItem;
  pinned: boolean;
  showSchema?: boolean;
}

interface RootItem extends BaseItem {
  type: "root";
  entity: string;
}

interface SchemaItem extends BaseItem {
  type: "schema";
  entity: string;
  parent: BaseItem;
}

interface TableItem extends BaseItem {
  type: "table";
  entity: TableOrView;
  parent: BaseItem;
  loadingColumns: boolean;
  matchingColumns?: any[];
}

interface RoutineItem extends BaseItem {
  type: "routine";
  entity: Routine;
  parent: BaseItem;
}

export default Vue.extend({
  mixins: [TableListContextMenus],
  components: { VirtualList },
  data() {
    return {
      items: [],
      displayItems: [],
      itemComponent: ItemComponent,
      estimateItemHeight: this.$bksConfig.ui.tableList.itemHeight, // height of collapsed item
      keeps: 30,
      generated: false,
      searchExpansionSnapshot: null as Map<string, boolean> | null,
    };
  },
  methods: {
    generateItems() {
      const items = [] as Item[];
      const columnIndex = indexColumnResults(this.columnSearch.results);
      const noFolder = this.schemaTables.length === 1;
      const root: RootItem = {
        type: "root",
        entity: "",
        key: "",
        expanded: true,
        hidden: false,
        contextMenu: [],
        level: 0,
        pinned: false,
      };

      const expandedMap = new Map();
      const pinnedMap = new Map();

      if (this.generated && this.items.length > 0) {
        for (const item of this.items) {
          if (item.expanded) {
            expandedMap.set(item.key, true);
          }
          if (item.pinned) {
            pinnedMap.set(item.key, true);
          }
        }
      }
      if (this.filterQuery && !this.searchExpansionSnapshot) {
        this.searchExpansionSnapshot = new Map(this.items.map(item => [item.key, item.expanded]));
      } else if (!this.filterQuery && this.searchExpansionSnapshot) {
        expandedMap.clear();
        this.searchExpansionSnapshot.forEach((expanded, key) => {
          if (expanded) expandedMap.set(key, true);
        });
        this.searchExpansionSnapshot = null;
      }

      for (const pin of this.pins) {
        const key = entityId(pin.schemaName, pin.entity);
        pinnedMap.set(key, true);
      }

      this.schemaTables.forEach((schema: any) => {
        let parent: BaseItem;

        if (noFolder) {
          parent = root;
        } else {
          const key = entityId(schema.schema);
          const schemaItem: SchemaItem = {
            type: "schema",
            key,
            entity: schema.schema,
            expanded: this.filterQuery ? true : !this.generated
              ? this.defaultSchema === schema.schema
              : expandedMap.has(key),
            hidden: this.hiddenSchemas.includes(schema.schema),
            contextMenu: this.schemaMenuOptions,
            parent: root,
            level: 0,
            pinned: false,
          };
          items.push(schemaItem);
          parent = schemaItem;
        }

        schema.tables.forEach((table: TableOrView) => {
          const key = entityId(schema.flatSearch ? table.schema : schema.schema, table);
          const matched = this.filterQuery && this.columnSearch.query === this.filterQuery
            ? matchColumnResults(columnIndex, table.schema, table.name, this.database)
            : [];
          items.push({
            type: "table",
            key,
            entity: table,
            expanded: matched.length > 0 || expandedMap.has(key),
            hidden: this.hiddenEntities.includes(table) || (schema.flatSearch && this.hiddenSchemas.includes(table.schema)),
            contextMenu: this.tableMenuOptions,
            parent,
            level: noFolder ? 0 : 1,
            pinned: pinnedMap.has(key) || false,
            loadingColumns: false,
            matchingColumns: matched.length ? matched : undefined,
            showSchema: schema.flatSearch,
          });
        });

        schema.routines.forEach((routine: Routine) => {
          const key = entityId(schema.flatSearch ? routine.schema : schema.schema, routine);
          items.push({
            entity: routine,
            key,
            type: "routine",
            expanded: expandedMap.has(key),
            hidden: this.hiddenEntities.includes(routine) || (schema.flatSearch && this.hiddenSchemas.includes(routine.schema)),
            contextMenu: this.routineMenuOptions,
            parent,
            level: noFolder ? 0 : 1,
            pinned: pinnedMap.has(key) || false,
            showSchema: schema.flatSearch,
          });
        });
      });

      this.items = items;
      this.generated = true;
    },
    generateDisplayItems() {
      let totalHeight = 0;
      const displayItems: Item[] = [];
      const items: Item[] = this.items;

      for (const item of items) {
        // Skip rendering routines in minimal mode
        if (this.$store.getters.minimalMode && item.type === 'routine') {
          continue;
        }

        if (!item.hidden && !item.parent.hidden && item.parent.expanded) {
          displayItems.push(item);

          // Summarizing the total height of all list items to get the average height

          totalHeight += this.$bksConfig.ui.tableList.itemHeight; // height of list item

          if (item.expanded) {
            if (item.type === "table") {
              const cols = item.matchingColumns?.length ?? item.entity.columns?.length ?? 1;
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
        this.estimateItemHeight = this.$bksConfig.ui.tableList.itemHeight;
      }
      this.displayItems = displayItems;
    },
    loadColumns(item: TableItem) {
      item.loadingColumns = true;
      this.$nextTick(() => {
        this.$store.dispatch("updateTableColumns", item.entity).finally(() => {
          item.loadingColumns = false;
        });
      });
    },
    updateTableColumnsInRange(whenEmpty = false) {
      const range = this.$refs.vList.range;

      for (let i = range.start; i < range.end + 1; i++) {
        const item = this.displayItems[i];
        if (!item.expanded) continue;
        if (item.type !== "table") continue;
        if (item.matchingColumns) continue;
        if (whenEmpty && item.entity.columns?.length) continue;
        if (item.loadingColumns) continue;

        this.loadColumns(item);
      }
    },
    handleExpand(_: Event, item: Item) {
      item.expanded = !item.expanded;
      if (item.expanded && item.type === "table" && !item.matchingColumns) {
        this.loadColumns(item);
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
        });
      }
    },
    handleTogglePinned(entity: Entity, pinned?: boolean) {
      const item = this.items.find((item: Item) => item.entity === entity);
      if (!item) return;

      if (typeof pinned === "undefined") {
        pinned = !item.pinned;
      }
      item.pinned = pinned;
    },
    handleScrollEnd() {
      this.updateTableColumnsInRange(true);
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
      minimalMode: "minimalMode",
      hiddenEntities: "hideEntities/databaseEntities",
      hiddenSchemas: "hideEntities/databaseSchemas",
    }),
    ...mapState("pins", ["pins"]),
    ...mapState(["database", "columnSearch"]),
    filterQuery() {
      return this.$store.state.entityFilter.filterQuery;
    },
  },
  watch: {
    schemaTables() {
      this.generateItems();
      this.generateDisplayItems();
    },
    columnSearch: {
      deep: true,
      handler() {
        this.generateItems();
        this.generateDisplayItems();
      },
    },
    minimalMode() {
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
