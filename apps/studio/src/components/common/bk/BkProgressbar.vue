<template>
  <div
    class="bk-progressbar"
    v-bind="$attrs"
  >
    <div class="bk-progressbar-bar bk-progressbar-primary" />
    <div class="bk-progressbar-bar bk-progressbar-secondary" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkProgressbar",
  inheritAttrs: false,
});
</script>
