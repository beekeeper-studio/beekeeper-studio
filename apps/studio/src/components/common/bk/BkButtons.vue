<template>
  <div
    class="bk-buttons"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkButtons",
  inheritAttrs: false,
});
</script>
