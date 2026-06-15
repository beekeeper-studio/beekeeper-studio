<template>
  <span
    class="bk-label"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </span>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkLabel",
  inheritAttrs: false,
});
</script>
