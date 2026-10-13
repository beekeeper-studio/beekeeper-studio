<template>
  <virtual-list
    ref="vList"
    class="virtual-plugin-list list-body"
    :data-key="'id'"
    :data-sources="displayItems"
    :data-component="itemComponent"
    :estimate-size="estimateItemHeight"
    :extra-props="{
      isSearching,
      brokenAvatars,
      emit,
      handleItemClick,
      markAsBrokenAvatar
    }"
  />
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import VirtualList from "vue-virtual-scroll-list";
import PluginItem from "./PluginItem.vue";
import type { Plugin, PluginDisplayItem } from "@/services/plugin/types";
import { mapGetters } from "vuex";

export default Vue.extend({
  components: { VirtualList },
  data() {
    return {
      displayItems: [],
      brokenAvatars: [] as string[],
      keeps: 30,
      estimateItemHeight: 115, // a guess
      itemComponent: PluginItem
    }
  },
  props: {
    rawItems: {
      type: Array as PropType<Plugin[]>
    },
    isSearching: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapGetters("plugins/snapshots", ["snapshotsById"]),
  },
  methods: {
    generateDisplayItems() {
      // let totalHeight = 0;
      const displayItems: PluginDisplayItem[] = [];
      const items: Plugin[] = this.rawItems;

      for (const item of items) {
        displayItems.push({
          ...item,
          disabled: this.snapshotsById[item.id]?.disableState.disabled
        });
      }

      this.displayItems = displayItems;
    },
    handleItemClick() {

    },
    markAsBrokenAvatar(id: string) {
      this.brokenAvatars.push(id);
    },
    emit(eventName: string, source: PluginDisplayItem) {
      this.$emit(eventName, source);
    }
  },
  watch: {
    rawItems() {
      this.generateDisplayItems();
    }
  },
  mounted() {
    this.generateDisplayItems();
  }
})
</script>

<style lang="scss" scoped>
.virtual-plugin-list {
  overflow: auto;
}
</style>
