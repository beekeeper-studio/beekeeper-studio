<template>
  <slideover
    v-if="parentPage"
    ref="slideover"
    mount-to-nearest=".config > .content"
    :loading="loading"
    @close="onSlideoverClose"
  >
    <template #title>
      <h2>{{ title }}</h2>
    </template>
    <slot :open="config.open" />
  </slideover>
  <div
    v-else
    v-show="containsActivePage"
    class="config-page"
  >
    <x-progressbar v-if="loading" />
    <div
      v-show="isActive"
      class="config-page-header"
    >
      <h2>{{ title }}</h2>
    </div>
    <div
      class="config-page-body"
      :class="{ 'has-open-child': !isActive }"
    >
      <slot :open="config.open" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Slideover from "@/components/common/Slideover.vue";

export default Vue.extend({
  name: "ConfigPage",
  components: { Slideover },
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
  watch: {
    containsActivePage() {
      this.syncSlideover();
    },
  },
  created() {
    this.config.register(this);
  },
  mounted() {
    this.syncSlideover();
  },
  beforeDestroy() {
    this.config.unregister(this);
  },
  methods: {
    onSlideoverClose() {
      // Also fires when another page took over, which must not navigate again.
      if (this.isActive) {
        this.config.back(this.parentPage.id);
      }
    },
    syncSlideover() {
      const slideover = this.$refs.slideover as any;
      if (!slideover) {
        return;
      }
      if (this.containsActivePage) {
        slideover.show();
      } else {
        slideover.close();
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.config-page {
  --config-page-header-height: 2.6rem;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
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

// Each page scrolls on its own so a virtual list inside can fill it
.config-page-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;

  ::v-deep > .config-page-content {
    height: 100%;
  }
}

// While a nested page is active, hide everything else on this page
.config-page-body.has-open-child ::v-deep {
  > :not(.config-page, .config-page-content),
  > .config-page-content > :not(.config-page) {
    display: none;
  }
}

x-progressbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
</style>
