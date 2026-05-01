<template>
  <div class="banner" v-if="privacyMode">
    <span>
      <a href="https://docs.beekeeperstudio.io/user_guide/security/#privacy-mode">Privacy mode</a> is enabled. Some information is redacted.
    </span>
    <button
      type="button"
      @click.prevent="togglePrivacy"
      class="btn btn-primary btn-small"
    >
      Disable Privacy Mode
    </button>
  </div>
</template>

<script lang="ts">
import { AppEvent } from "@/common/AppEvent";
import Vue from "vue";

export default Vue.extend({
  props: ['privacyMode'],
  methods: {
    togglePrivacy() {
      window.main.send(AppEvent.menuClick, 'togglePrivacyMode')
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
    padding-top: .2rem;
    padding-bottom: .2rem;
    font-weight: 700;
    font-size: .875rem;
    a {
      color: #181818;
      text-decoration: underline;
    }
  }
</style>
