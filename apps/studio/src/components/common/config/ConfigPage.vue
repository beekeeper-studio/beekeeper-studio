<template>
  <div
    v-show="containsActivePage"
    class="config-page"
  >
    <x-progressbar v-if="loading" />
    <div
      v-show="isActive"
      class="config-page-header"
    >
      <a
        v-if="parentPage"
        href="#"
        class="config-page-back"
        @click.prevent="config.back(parentPage.id)"
      >
        <i class="material-icons">arrow_back</i>
      </a>
      <h2>{{ title }}</h2>
    </div>
    <transition :name="parentPage ? 'slideover' : null">
      <div
        v-show="containsActivePage"
        class="config-page-body"
        :class="{ 'has-open-child': !isActive }"
      >
        <slot :open="config.open" />
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "ConfigPage",
  provide() {
    return { parentPage: this };
  },
  inject: {
    config: {},
    parentPage: { default: null },
  },
  props: {
    /** Unique page id. Pass it to `open()` or `v-model` to show this page. */
    id: {
      type: String,
      required: true,
    },
    /** Heading of the page, also used as its tab label when top-level. */
    title: {
      type: String,
      required: true,
    },
    /** Material icon name shown in the tab. Only used by top-level pages. */
    icon: {
      type: String,
      default: null,
    },
    /** Show a progress bar at the top of the page. */
    loading: Boolean,
  },
  computed: {
    isActive(): boolean {
      return this.config.activePageId === this.id;
    },
    containsActivePage(): boolean {
      let page = this.config.activePage;
      while (page) {
        if (page === this) {
          return true;
        }
        page = page.parentPage;
      }
      return false;
    },
  },
  created() {
    this.config.register(this);
  },
  beforeDestroy() {
    this.config.unregister(this);
  },
});
</script>

<style lang="scss" scoped>
.config-page {
  --config-page-header-height: 2.6rem;
  position: relative;
}

.config-page-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: var(--config-page-header-height);
  padding-inline: 0.5rem;
  padding-bottom: 0.4rem;
  background: var(--panel-bg);

  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
}

.config-page-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 1.8rem;
  color: var(--text-dark);
  transition: background 0.15s ease-in-out;
  // make the button look visually aligned
  margin-left: -0.35rem;

  &:hover,
  &:focus {
    background: var(--gray-a4);
  }

  .material-icons {
    font-size: 1.25rem;
  }
}

// While a nested page is active, hide everything else on this page
.config-page-body.has-open-child ::v-deep {
  > :not(.config-page, .config-page-content),
  > .config-page-content > :not(.config-page) {
    display: none;
  }
}

.slideover-enter-active,
.slideover-leave-active {
  transition: transform 0.25s ease;
}

.slideover-enter,
.slideover-leave-to {
  transform: translateX(100%);
}

x-progressbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
</style>
