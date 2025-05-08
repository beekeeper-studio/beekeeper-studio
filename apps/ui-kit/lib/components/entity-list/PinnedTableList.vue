<template>
  <nav class="pinned-entity-list list-group flex-col">
    <div class="list-heading">
      <span class="sub">Pinned</span>
      <span class="badge">{{ sortedEntities.length }}</span>
      <div class="actions sort-buttons">
        <button
          v-if="sortBy !== 'position'"
          class="actions-btn btn btn-link btn-sm"
          :title="sortOrderLabel"
          @click.prevent="handleSortOrderClick"
        >
          <i v-if="sortOrder == 'desc'" class="material-icons">expand_more</i>
          <i v-else class="material-icons">expand_less</i>
        </button>
        <button
          class="actions-btn btn btn-link btn-sm"
          :title="`Sorted by ${sortByLabel} (${sortOrderLabel})`"
          @click.prevent="handleSortByClick"
        >
          <i class="material-icons-outlined">sort</i>
        </button>
      </div>
    </div>
    <Draggable
      :options="{ handle: '.drag-handle' }"
      v-model="sortedEntities"
      tag="div"
      ref="pinContainer"
      class="list-body"
    >
      <template v-for="entity in sortedEntities">
        <stateless-table-list-item
          v-if="entity.entityType !== 'routine'"
          :key="idOf(entity)"
          :table="entity"
          :enable-pinning="true"
          :pinned="true"
          :level="0"
          :no-select="true"
          :draggable="sortBy === 'position'"
          :expanded="isExpanded(entity)"
          @pin="$emit('pin', entity)"
          @expand="handleExpand(entity)"
          @contextmenu.prevent.stop="$emit('contextmenu', event, entity)"
        />
        <stateless-routine-list-item
          v-else
          :key="idOf(entity)"
          :routine="entity"
          :enable-pinning="true"
          :pinned="true"
          :level="0"
          :draggable="sortBy === 'position'"
          :expanded="isExpanded(entity)"
          @pin="$emit('pin', entity)"
          @contextmenu.prevent.stop="$emit('contextmenu', event, entity)"
        />
      </template>
    </Draggable>
  </nav>
</template>

<script lang="ts">
import _ from "lodash";
import Draggable from "vuedraggable";
import StatelessTableListItem from "./StatelessTableListItem.vue";
import StatelessRoutineListItem from "./StatelessRoutineListItem.vue";
import Vue, { PropType } from "vue";
import { Entity } from "../types";
import { openMenu } from "../context-menu/menu";
import { idOf } from "./treeItems";
import { canHaveColumns, shouldRequestColumns } from "../../utils/entity";
import { SortByValues } from "./models";

export default Vue.extend({
  components: {
    Draggable,
    StatelessTableListItem,
    StatelessRoutineListItem,
  },
  props: {
    entities: {
      type: Array as PropType<Entity[]>,
      default: () => [],
    },
    sortBy: {
      type: String as PropType<typeof SortByValues[number]>,
      default: "position",
      validator(value: typeof SortByValues[number]) {
        return SortByValues.includes(value);
      },
    },
    sortOrder: {
      type: String,
      default: "asc",
    },
  },
  data() {
    return {
      expandedEntityIds: [],
    };
  },
  computed: {
    sortByLabel() {
      return this.sortBy === "position" ? "Drag & Drop" : "Alphanumeric";
    },
    sortOrderLabel() {
      return this.sortOrder === "asc" ? "Ascending" : "Descending";
    },
    sortedEntities: {
      get() {
        if (this.sortBy === "position") {
          return this.entities;
        }
        const result = _.sortBy(this.entities, this.sortBy);
        if (this.sortOrder === "desc") {
          return result.reverse();
        }
        return result;
      },
      set(entities: Entity[]) {
        this.$emit("sort-position", entities);
      },
    },
  },
  methods: {
    isExpanded(entity: Entity) {
      return this.expandedEntityIds.includes(idOf(entity));
    },
    expand(entity: Entity) {
      this.expandedEntityIds.push(idOf(entity));
    },
    collapse(entity: Entity) {
      this.expandedEntityIds = this.expandedEntityIds.filter(
        (id: string) => id !== idOf(entity)
      );
    },
    handleExpand(entity: Entity) {
      const expanded = !this.isExpanded(entity);
      if (expanded) {
        this.expand(entity);
      } else {
        this.collapse(entity);
      }
      if (canHaveColumns(entity) && expanded && shouldRequestColumns(entity)) {
        this.$emit("request-entities-columns", [entity]);
      }
    },
    handleSortOrderClick() {
      this.$emit("sort-order");
    },
    handleSortByClick(event: MouseEvent) {
      openMenu({
        event,
        options: [
          {
            label: "Drag & Drop",
            id: "drag-and-drop",
            checked: this.sortBy === "position",
            handler: () => {
              this.$emit("sort-by", "position");
            },
          },
          {
            label: "Alphanumeric",
            id: "alphanumeric",
            checked: this.sortBy === "name",
            handler: () => {
              this.$emit("sort-by", "name");
            },
          },
        ],
      });
    },
    idOf,
  },
});
</script>
