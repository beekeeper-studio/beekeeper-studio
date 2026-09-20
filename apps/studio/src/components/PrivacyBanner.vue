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
    background-color: var(--warning-solid-bg);
    color: var(--warning-solid-fg);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding-top: .2rem;
    padding-bottom: .2rem;
    font-weight: 700;
    font-size: .875rem;
    a {
      color: var(--warning-solid-fg);
      text-decoration: underline;
    }
  }
</style>
