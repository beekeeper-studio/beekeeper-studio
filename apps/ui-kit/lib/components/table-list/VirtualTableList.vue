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
    :extra-props="{ onExpand: handleExpand, onPin: handlePin, onDblClick: handleDblClick, onContextMenu: handleContextMenu }"
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

import { Routine, Entity, Table, Item, BaseItem, RootItem, SchemaItem, TableItem, RoutineItem } from "./models";

// TODO(@azmi): make a new type instead
// import { TransportPinnedEntity } from "@/common/transport";
type TransportPinnedEntity = any

// TODO(@azmi): make a new util function insteaed
// import { entityId } from "@/common/utils";
/** Useful for identifying an entity item in table list */
export function entityId(schema: string, entity?: Table | Routine) {
  if (entity) return `${entity.entityType}.${schema}.${entity.name}`;
  return `schema.${schema}`;
}

import Vue from "vue";
import { RootEventMixin } from "../mixins/RootEvent";
import ItemComponent from "./Item.vue";
import VirtualList from "vue-virtual-scroll-list";
import { TableListEvents } from "./constants";
// TODO(@azmi): to remove

// import { mapGetters, mapState } from "vuex";
import * as globals from "../../utils/constants";
import "scrollyfills";

export default Vue.extend({
  mixins: [RootEventMixin],
  components: { VirtualList },
  props: {
    tables: {
      type: Array,
      default: () => [],
    },
  },
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
            // FIXME
            hidden: false, // hidden: this.hiddenSchemas.includes(schema.schema),
            parent: root,
            level: 0,
            pinned: false,
          };
          items.push(schemaItem);
          parent = schemaItem;
        }

        schema.tables.forEach((table: Table) => {
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
    updateColumns(item: TableItem) {
      this.$emit("update-columns", item)
    },
    updateTableColumnsInRange(whenEmpty = false) {
      const range = this.$refs.vList.range;

      for (let i = range.start; i < range.end + 1; i++) {
        const item = this.displayItems[i];
        if (!item.expanded) continue;
        if (item.type !== "table") continue;
        if (whenEmpty && item.entity.columns?.length) continue;
        if (item.loadingColumns) continue;

        this.updateColumns(item);
      }
    },
    handleExpand(_: Event, item: Item) {
      item.expanded = !item.expanded;
      if (item.expanded && item.type === "table") {
        this.updateColumns(item);
      }
      this.$emit("expand", item);
      this.generateDisplayItems();
    },
    handlePin(_: Event, item: TableItem) {
      // this.trigger(AppEvent.togglePinTableList, item.entity, !item.pinned);
    },
    handleDblClick(e: Event, item: Item) {
      this.$emit("dblclick", e, item);
    },
    handleContextMenu(e: Event, item: Item) {
      this.$emit("contextmenu", e, item);
    },
    handleToggleHidden(
      entity: Table | Routine | string,
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
      this.$emit("expand-all", expand);
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
          event: TableListEvents.toggleExpandTableList,
          handler: this.handleToggleExpandedAll,
        },
        // {
        //   // event: AppEvent.togglePinTableList,
        //   handler: this.handleTogglePinned,
        // },
      ];
    },
    // TODO(@azmi): uuh... this whole thing is unnecessary
    schemaTables(){
      const noSchema = Symbol('noSchema')
      const schemaCollection = Object.groupBy(this.tables, ({ schema }) => {
        if (!schema) {
          return noSchema
        }
        return schema
      })

      const schemaList = []
      if (schemaCollection[noSchema]) {
        schemaList.push({
          tables: schemaCollection[noSchema],
          routines: [],
        })
      }
      Object.keys(schemaCollection).forEach((key) => schemaList.push({
        schema: key,
        tables: schemaCollection[key],
        routines: [],
      }))
      return schemaList
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
    schemaTables: {
      handler() {
        this.generateItems();
        this.generateDisplayItems();
      },
      immediate: true,
    },
    minimalMode() {
      this.generateDisplayItems();
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
