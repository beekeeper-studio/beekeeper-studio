<template>
  <div
    class="bk-tab"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
    <div class="bk-tab-selection-indicator" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkTab",
  inheritAttrs: false,
});
</script>
