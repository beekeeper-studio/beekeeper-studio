<template>
  <div
    class="bk-menuitem"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <svg
      v-if="isTogglable"
      class="bk-checkmark"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path d="M 37.5 65 L 21 48.9 L 15.7 54.35 L 37.5 76.1 L 84.3 29.3 L 78.8 23.8 Z" />
    </svg>
    <slot />
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkMenuitem",
  inheritAttrs: false,
  computed: {
    isTogglable(): boolean {
      const t = this.$attrs.togglable;
      return t !== undefined && t !== false && (t as unknown) !== "false";
    },
  },
});
</script>
