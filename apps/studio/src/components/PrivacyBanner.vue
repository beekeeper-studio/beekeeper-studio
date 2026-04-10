<template>
  <div class="banner" v-if="privacyMode">
    <span>
      In Privacy Mode
    </span>
    <i class="material-icons">
      visibility_off
    </i>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: ['privacyMode']
});
</script>

<style lang="scss" scoped>
  .banner {
    background-color: var(--brand-warning);
    color: var(--statusbar-text);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding-top: .25rem;
    padding-bottom: .25rem;
  }
</style>
