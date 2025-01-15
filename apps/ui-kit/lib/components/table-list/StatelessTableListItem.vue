<template>
  <div
    class="list-item table-item"
    :style="{ '--level': level }"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <a
      class="list-item-btn"
      role="button"
      :class="{ open: expanded }"
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
        @dblclick.prevent="$emit('dblclick', $event)"
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
      <!-- <span -->
      <!--   class="actions" -->
      <!--   :class="{ pinned: pinned }" -->
      <!-- > -->
      <!--   <span -->
      <!--     class="btn-fab pin" -->
      <!--     :class="{ pinned: pinned }" -->
      <!--     :title="pinned ? 'Unpin' : 'Pin'" -->
      <!--     @mousedown.prevent.stop="$emit('pin', $event)" -->
      <!--   > -->
      <!--     <i class="bk-pin" /> -->
      <!--     <i class="material-icons unpin">clear</i> -->
      <!--   </span> -->
      <!-- </span> -->
    </a>
    <div
      v-if="expanded"
      class="sub-items"
    >
      <span
        class="sub-item"
        v-if="!loadingColumns && !(table.columns?.length)"
      >
        No Columns
      </span>
      <template v-else-if="table.columns?.length > 0">
        <span
          :key="c.name"
          v-for="(c, i) in table.columns"
          class="sub-item"
        >
          <span
            class="title truncate"
            ref="title"
          >{{
            c.field
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
import _ from "lodash";
import TableIcon from "./TableIcon.vue";

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
});
</script>
