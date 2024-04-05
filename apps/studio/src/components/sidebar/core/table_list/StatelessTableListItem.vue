<template>
  <div
    class="list-item table-item"
    :style="{ '--level': level }"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <a
      class="list-item-btn"
      role="button"
      :class="{ active: active, selected: selected, open: expanded }"
    >
      <span
        @contextmenu.prevent.stop=""
        class="btn-fab open-close"
        @click.prevent="$emit('expand', $event)"
      >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span
        class="item-wrapper flex flex-middle expand"
        @dblclick.prevent="openTable"
        @mousedown="selectItem"
      >
        <span
          :title="draggable ? 'drag me!' : ''"
          class="table-item-wrapper"
          :class="{ draggable: draggable, 'drag-handle': draggable }"
        >
          <table-icon
            :table="table"
            class="table-icon"
          />
          <i
            class="material-icons item-icon dh"
            v-if="draggable"
          >menu</i>
        </span>
        <span
          class="table-name truncate"
          :title="table.name"
        >{{
          table.name
        }}</span>
      </span>
      <span
        class="actions"
        :class="{ pinned: pinned }"
      >
        <span
          class="btn-fab pin"
          :class="{ pinned: pinned }"
          :title="pinned ? 'Unpin' : 'Pin'"
          @mousedown.prevent.stop="$emit('pin', $event)"
        >
          <i class="bk-pin" />
          <i class="material-icons unpin">clear</i>
        </span>
      </span>
    </a>
    <div
      v-if="expanded"
      class="sub-items"
    >
      <span
        class="sub-item"
        v-if="!loadingColumns && !table.columns?.length"
      >
        No Columns
      </span>
      <template v-else-if="table.columns?.length > 0">
        <span
          :key="c.columnName"
          v-for="(c, i) in table.columns"
          class="sub-item"
        >
          <span
            class="title truncate"
            ref="title"
            @click="selectColumn(i)"
          >{{
            c.columnName
          }}</span>
          <span
            class="badge"
            :class="c.dataType"
          ><span>{{ c.dataType }}</span></span>
        </span>
      </template>
      <span
        class="sub-item"
        v-else
      >
        Loading columns...
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped="true">
.sub-item {
  .title {
    user-select: text;
    cursor: pointer;
  }
}

.drag-handle.draggable {
  .dh {
    display: none;
  }

  &:hover {
    .dh {
      display: inline-block;
    }

    .table-icon {
      display: none;
    }
  }
}
</style>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import _ from "lodash";
import TableIcon from "@/components/common/TableIcon.vue";

export default Vue.extend({
  props: [
    "id",
    "table",
    "container",
    "pinned",
    "draggable",
    "level",
    "expanded",
    "loadingColumns",
  ],
  components: { TableIcon },
  data() {
    return {
      clickState: {
        timer: null,
        openClicks: 0,
        delay: 500,
      },
    };
  },
  watch: {
    active() {
      if (this.selected) {
        let shouldScroll = true;
        if (this.container) {
          const box = this.$el.getBoundingClientRect();
          const parentBox = this.container.getBoundingClientRect();
          shouldScroll = !(
            box.top > parentBox.top && box.bottom <= parentBox.bottom
          );
        }
        if (shouldScroll) {
          this.$el.scrollIntoView();
        }
      }
    },
  },
  computed: {
    selected() {
      return this.selectedSidebarItem === this.id;
    },
    active() {
      const tableSelected =
        this.activeTab &&
        this.activeTab.table &&
        this.activeTab.table.name === this.table.name &&
        this.activeTab.table.schema === this.table.schema;

      return tableSelected;
    },
    ...mapGetters(["selectedSidebarItem"]),
    ...mapState(["activeTab"]),
  },
  methods: {
    selectItem() {
      this.$store.commit("selectSidebarItem", this.id);
    },
    selectColumn(i) {
      this.selectChildren(this.$refs.title[i]);
    },
    openTable() {
      if (this.clickState.openClicks > 0) {
        return;
      }
      this.$root.$emit("loadTable", { table: this.table });
      this.clickState.openClicks++;
      this.clickState.timer = setTimeout(() => {
        this.clickState.openClicks = 0;
      }, this.clickState.delay);
    },
  },
});
</script>
