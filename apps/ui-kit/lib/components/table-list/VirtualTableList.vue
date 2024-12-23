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

// TODO(@azmi): make new types instead
// import { TableOrView, Routine } from "@/lib/db/models";
type TableOrView = any
type Routine = any

// TODO(@azmi): make a new type instead
// import { TransportPinnedEntity } from "@/common/transport";
type TransportPinnedEntity = any

// TODO(@azmi): make a new util function insteaed
// import { entityId } from "@/common/utils";
/** Useful for identifying an entity item in table list */
export function entityId(schema: string, entity?: TableOrView | Routine) {
  if (entity) return `${entity.entityType}.${schema}.${entity.name}`;
  return `schema.${schema}`;
}

import Vue from "vue";
import TableListContextMenus from "./mixins/TableListContextMenus";
import ItemComponent from "./Item.vue";
import VirtualList from "vue-virtual-scroll-list";
// TODO(@azmi): to remove
// import { AppEvent } from "@/common/AppEvent";
// import { mapGetters, mapState } from "vuex";
import * as globals from "../../utils/constants";
import "scrollyfills";

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
      estimateItemHeight: globals.tableListItemHeight, // height of collapsed item
      keeps: 30,
      generated: false,
    };
  },
  methods: {
    generateItems() {
      const items = [] as Item[];
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
            expanded: !this.generated
              ? this.defaultSchema === schema.schema
              : this.items.findIndex(
                  (item: Item) => item.key === key && item.expanded
                ) >= 0,
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
          const key = entityId(schema.schema, table);
          items.push({
            type: "table",
            key,
            entity: table,
            expanded:
              this.items.findIndex(
                (item: Item) => item.key === key && item.expanded
              ) >= 0,
            hidden: this.hiddenEntities.includes(table),
            contextMenu: this.tableMenuOptions,
            parent,
            level: noFolder ? 0 : 1,
            pinned: this.pins.find((pin: TransportPinnedEntity) => pin.entity === table),
            loadingColumns: false,
          });
        });

        schema.routines.forEach((routine: Routine) => {
          const key = entityId(schema.schema, routine);
          items.push({
            entity: routine,
            key,
            type: "routine",
            expanded:
              this.items.findIndex(
                (item: Item) => item.key === key && item.expanded
              ) >= 0,
            hidden: this.hiddenEntities.includes(routine),
            contextMenu: this.routineMenuOptions,
            parent,
            level: noFolder ? 0 : 1,
            pinned: this.pins.find(
              (pin: TransportPinnedEntity) => pin.entity === routine
            ),
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
        // if (this.$store.getters.minimalMode && item.type === 'routine') {
        //   continue;
        // }

        if (!item.hidden && !item.parent.hidden && item.parent.expanded) {
          displayItems.push(item);

          // Summarizing the total height of all list items to get the average height

          totalHeight += globals.tableListItemHeight; // height of list item

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
        this.estimateItemHeight = globals.tableListItemHeight;
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
        if (whenEmpty && item.entity.columns?.length) continue;
        if (item.loadingColumns) continue;

        this.loadColumns(item);
      }
    },
    handleExpand(_: Event, item: Item) {
      item.expanded = !item.expanded;
      if (item.expanded && item.type === "table") {
        this.loadColumns(item);
      }
      this.generateDisplayItems();
    },
    handlePin(_: Event, item: TableItem) {
      // this.trigger(AppEvent.togglePinTableList, item.entity, !item.pinned);
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
        const minKeeps = Math.ceil(vListHeight / this.estimateItemHeight);
        this.keeps = Math.max(30, Math.ceil(minKeeps * 1.3));
      });
    },
    rootBindings() {
      return [
        // { event: AppEvent.toggleHideSchema, handler: this.handleToggleHidden },
        // { event: AppEvent.toggleHideEntity, handler: this.handleToggleHidden },
        {
          // event: AppEvent.toggleExpandTableList,
          handler: this.handleToggleExpandedAll,
        },
        {
          // event: AppEvent.togglePinTableList,
          handler: this.handleTogglePinned,
        },
      ];
    },
    // FIXME remove this
    schemaTables(g){
      return [{"schema":null,"skipSchemaDisplay":true,"tables":[{"name":"cheeses","entityType":"table","columns":[{"tableName":"cheeses","columnName":"id","dataType":"INTEGER","nullable":true,"defaultValue":null,"ordinalPosition":0,"hasDefault":false,"generated":false,"bksField":{"name":"id","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"name","dataType":"VARCHAR(255)","nullable":false,"defaultValue":null,"ordinalPosition":1,"hasDefault":false,"generated":false,"bksField":{"name":"name","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"origin_country_id","dataType":"INTEGER","nullable":false,"defaultValue":null,"ordinalPosition":2,"hasDefault":false,"generated":false,"bksField":{"name":"origin_country_id","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"cheese_type","dataType":"VARCHAR(255)","nullable":false,"defaultValue":null,"ordinalPosition":3,"hasDefault":false,"generated":false,"bksField":{"name":"cheese_type","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"description","dataType":"TEXT","nullable":true,"defaultValue":null,"ordinalPosition":4,"hasDefault":false,"generated":false,"bksField":{"name":"description","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"first_seen","dataType":"DATETIME","nullable":true,"defaultValue":null,"ordinalPosition":5,"hasDefault":false,"generated":false,"bksField":{"name":"first_seen","bksType":"UNKNOWN"}}]},{"name":"countries","entityType":"table"},{"name":"neko","entityType":"table"},{"name":"producers","entityType":"table"},{"name":"reviews","entityType":"table"},{"name":"sqlite_sequence","entityType":"table"},{"name":"stores","entityType":"table"},{"name":"cheese_summary","entityType":"view"}],"routines":[]}]
    },
    // FIXME remove this
    hiddenEntities() {
      return []
    },
    // FIXME remove this
    pins() {
      return []
    },
    // ...mapGetters({
    //   defaultSchema: "defaultSchema",
    //   schemaTables: "schemaTables",
    //   minimalMode: "minimalMode",
    //   hiddenEntities: "hideEntities/databaseEntities",
    //   hiddenSchemas: "hideEntities/databaseSchemas",
    // }),
    // ...mapState("pins", ["pins"]),
  },
  watch: {
    // schemaTables() {
    //   this.generateItems();
    //   this.generateDisplayItems();
    // },
    // FIXME use above
    schemaTables: {
      handler() {
      this.generateItems();
      this.generateDisplayItems();
    },
      immediate: true
    },
    minimalMode() {
      this.generateDisplayItems();
    },
  },
  mounted() {
    // FIXME
    // this.registerHandlers(this.rootBindings);
    this.$nextTick(() => this.resizeObserver.observe(this.$refs.vList.$el));
    this.$refs.vList.$el.addEventListener("scrollend", this.handleScrollEnd);
  },
  beforeDestroy() {
    // FIXME
    // this.unregisterHandlers(this.rootBindings);
    this.resizeObserver.disconnect();
    this.$refs.vList.$el.removeEventListener("scrollend", this.handleScrollEnd);
  },
});
</script>
