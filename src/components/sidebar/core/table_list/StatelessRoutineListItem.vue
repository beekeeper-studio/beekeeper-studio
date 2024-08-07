<template>
  <div
    class="list-item routine-item"
    :style="{ '--level': level }"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <a
      class="list-item-btn"
      role="button"
      :class="{ active: selected, open: expanded }"
    >
      <span
        class="btn-fab open-close"
        @click.prevent="$emit('expand', $event)"
        @contextmenu.stop.prevent=""
      >
        <i
          v-if="displayParams.length > 0"
          class="dropdown-icon material-icons"
        >keyboard_arrow_right</i>
      </span>
      <span class="item-wrapper flex flex-middle expand">
        <div
          :title="draggable ? 'drag me!' : ''"
          class="table-item-wrapper"
          :class="{ draggable: draggable, 'drag-handle': draggable }"
        >
          <i
            :title="title"
            :class="iconClass"
            class="item-icon entity-icon material-icons"
          >functions</i>
          <i
            class="material-icons item-icon dh"
            v-if="draggable"
          >menu</i>
        </div>

        <span
          class="table-name truncate"
          :title="routine.name"
        >{{
          routine.name
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
      <!-- <span class="sub-item" v-if="displayParams.length === 0">
        <span class="title truncate">No Parameters</span>
      </span>       -->
      <span
        :key="param.name"
        v-for="param in displayParams"
        class="sub-item"
      >
        <span
          class="title truncate"
          ref="title"
        >{{ param.name }}</span>
        <span
          class="badge"
          :class="param.type"
        >{{ param.type
        }}<span v-if="param.length">({{ param.length }})</span></span>
      </span>
    </div>
  </div>
</template>

<style lang="scss">
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
    .entity-icon {
      display: none;
    }
  }
}
</style>

<script lang="ts">
import Vue from "vue";
import { RoutineTypeNames } from "@/lib/db/models";

export default Vue.extend({
  props: ["routine", "pinned", "draggable", "level", "expanded"],
  data() {
    return {
      selected: false,
    };
  },
  watch: {
    selected() {
      if (this.selected) {
        this.$el.scrollIntoView();
      }
    },
  },
  computed: {
    displayParams() {
      const result = [...this.routine.routineParams];
      if (this.routine.returnType) {
        result.push({
          name: "RETURN",
          type: this.routine.returnType,
          length: this.routine.returnTypeLength,
        });
      }
      return result;
    },
    iconClass() {
      const result = { "routine-icon": true };
      result[`routine-${this.routine.type}-icon`] = true;
      return result;
    },
    title() {
      return RoutineTypeNames[this.routine.type];
    },
  },
});
</script>
