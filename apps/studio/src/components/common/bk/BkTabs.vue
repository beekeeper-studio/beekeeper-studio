<template>
  <div
    class="bk-tabs"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkTabs",
  inheritAttrs: false,
});
</script>
