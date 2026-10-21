<template>
  <virtual-list
    ref="vList"
    class="virtual-plugin-list list-body"
    :data-key="'id'"
    :data-sources="items"
    :data-component="itemComponent"
    :estimate-size="estimateItemHeight"
    :extra-props="{
      isSearching,
      brokenAvatars,
      emit,
      markAsBrokenAvatar
    }"
  />
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import VirtualList from "vue-virtual-scroll-list";
import PluginItem from "./PluginItem.vue";
import type { PluginDisplayItem } from "@/services/plugin/types";
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
    items: {
      type: Array as PropType<PluginDisplayItem[]>
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
    markAsBrokenAvatar(id: string) {
      this.brokenAvatars.push(id);
    },
    emit(eventName: string, source: PluginDisplayItem) {
      this.$emit(eventName, source);
    }
  },
})
</script>

<style lang="scss" scoped>
.virtual-plugin-list {
  overflow: auto;
}
</style>
