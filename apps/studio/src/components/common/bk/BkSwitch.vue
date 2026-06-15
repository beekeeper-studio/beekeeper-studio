<template>
  <div
    class="bk-switch"
    role="switch"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <div class="bk-switch-track" />
    <div class="bk-switch-thumb" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkSwitch",
  inheritAttrs: false,
});
</script>
