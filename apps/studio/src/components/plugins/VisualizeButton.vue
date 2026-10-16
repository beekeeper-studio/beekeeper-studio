<template>
  <x-button
    v-if="items.length > 0"
    class="btn btn-flat btn-icon end visualize-btn"
    :disabled="disabled"
    menu
  >
    <i class="material-icons">bar_chart</i>
    Visualize
    <i class="material-icons">arrow_drop_down</i>
    <x-menu>
      <div class="menu-section-label">
        {{ header }}
      </div>
      <x-menuitem
        v-for="item in items"
        :key="item.slug"
        :disabled="item.disabled"
        @click.prevent="select($event, item)"
      >
        <i class="material-icons">{{ item.leadingIcon }}</i>
        <x-label>{{ item.name }}</x-label>
      </x-menuitem>
      <hr>
      <x-menuitem @click.prevent="openPluginManager">
        <i class="material-icons">extension</i>
        <x-label>Manage Plugins…</x-label>
      </x-menuitem>
    </x-menu>
  </x-button>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { AppEvent } from "@/common/AppEvent";
import type { ContextItem } from "@/plugins/BeekeeperPlugin";
import type { PluginMenuConditions } from "@/store/modules/PopupMenuModule";

/**
 * Status bar button that opens the current data in a plugin. Lists the items
 * plugins add to `menuId`, and renders nothing when there are none.
 */
export default Vue.extend({
  props: {
    /** `results.statusbar` or `tableTable.statusbar` */
    menuId: {
      type: String,
      required: true,
    },
    /** Menu heading, e.g. "Open 10 rows in" */
    header: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    conditions: {
      type: Object as PropType<PluginMenuConditions>,
      default: undefined,
    },
  },
  computed: {
    items(): ContextItem[] {
      return this.$store.getters["popupMenu/getPluginMenuItems"](this.menuId, {
        conditions: this.conditions,
      });
    },
  },
  methods: {
    select(event: Event, item: ContextItem) {
      if (item.disabled) return;
      this.$emit("select", item, event);
    },
    openPluginManager() {
      this.$root.$emit(AppEvent.openPluginManager);
    },
  },
});
</script>
