<template>
  <div class="banner" v-if="privacyMode">
    <span>
      In Privacy Mode
    </span>
    <i
      class="material-icons"
      v-tooltip="'Privacy Mode is enabled, disable it in the View menu'"
    >
      visibility_off
    </i>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: ['privacyMode'],
  methods: {
    togglePrivacy() {
      this.$store.dispatch('settings/togglePrivacyMode')
    }
  }
});
</script>

<style lang="scss" scoped>
  .banner {
    background-color: var(--brand-warning);
    // TODO: Should get a set of font colors for each theme that contrast properly with the background colors (warning-text, danger-text, etc)
    color: #181818; 
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding-top: .5rem;
    padding-bottom: .5rem;
  }
</style>
