<template>
  <x-button
    class="btn btn-flat end visualize-btn"
    :disabled="disabled"
    menu
  >
    <i class="material-icons">bar_chart</i>
    Visualize
    <i class="material-icons">arrow_drop_down</i>
    <x-menu>
      <div class="BksContextMenu-section-label">
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
      <x-menuitem
        v-if="items.length === 0"
        disabled
        :title="noPluginsItem.title"
      >
        <i class="material-icons">{{ noPluginsItem.leadingIcon }}</i>
        <x-label>{{ noPluginsItem.name }}</x-label>
      </x-menuitem>
      <hr>
      <x-menuitem @click.prevent="openPluginManager">
        <i class="material-icons">{{ managePluginsItem.leadingIcon }}</i>
        <x-label>{{ managePluginsItem.name }}</x-label>
      </x-menuitem>
    </x-menu>
  </x-button>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import type { ContextItem } from "@/plugins/BeekeeperPlugin";
import type { PluginMenuConditions } from "@/store/modules/PopupMenuModule";
import { managePluginsItem, noPluginsItem, openPluginManager } from "@/lib/menu/pluginMenuItems";

/**
 * Status bar button that opens the current data in a plugin. Lists the items
 * plugins add to `menuId`, or a disabled "No Plugins…" row when there are
 * none, so the feature stays discoverable.
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
  data() {
    return { managePluginsItem, noPluginsItem };
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
    openPluginManager,
  },
});
</script>
