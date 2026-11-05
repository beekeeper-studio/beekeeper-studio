<template>
  <div class="config">
    <div class="config-nav">
      <div
        role="tablist"
        aria-orientation="vertical"
      >
        <button
          v-for="page in topLevelPages"
          :key="page.id"
          type="button"
          role="tab"
          class="btn nav-btn"
          :class="{ active: page.containsActivePage }"
          :aria-selected="page.containsActivePage ? 'true' : 'false'"
          @click="openTab(page.id)"
        >
          <i
            v-if="page.icon"
            class="material-icons"
          >{{ page.icon }}</i>
          <span :class="{ 'no-icon': !page.icon }">
            {{ page.title }}
          </span>
        </button>
      </div>
    </div>
    <div
      role="tabpanel"
      class="content"
    >
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "Config",
  model: {
    prop: "activePageId",
    event: "update:activePageId",
  },
  provide() {
    return { config: this };
  },
  props: {
    /** Id of the page being shown. Bind with `v-model`. */
    activePageId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      // Filled by each ConfigPage as it is created, in template order
      pages: [],
      // Ids of previously active pages, most recent last
      history: [] as string[],
      // How the next activePageId change should update the history
      nextChange: "open" as "open" | "back" | "tab",
    };
  },
  computed: {
    topLevelPages() {
      return this.pages.filter((page) => !page.parentPage);
    },
    activePage() {
      return this.pages.find((page) => page.id === this.activePageId);
    },
  },
  watch: {
    activePageId(_id: string, previousId: string) {
      if (this.nextChange === "tab") {
        this.history = [];
      } else if (this.nextChange === "open") {
        this.history.push(previousId);
      }
      this.nextChange = "open";
    },
  },
  methods: {
    openTab(id: string) {
      if (id === this.activePageId) {
        return;
      }
      this.nextChange = "tab";
      this.open(id);
    },
    back(fallbackId: string) {
      const previousId = this.history.pop() ?? fallbackId;
      this.nextChange = "back";
      this.open(previousId);
    },
    open(id: string) {
      this.$emit("update:activePageId", id);
    },
    register(page) {
      this.pages.push(page);
    },
    unregister(page) {
      this.pages = this.pages.filter((p) => p !== page);
    },
  },
});
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/app/_variables';

.config {
  display: flex;
  align-items: flex-start;
}

.config-nav {
  position: sticky;
  top: 0;
  width: 9rem;
  flex-shrink: 0;
}

[role="tablist"] {
  display: flex;
  flex-direction: column;
}

.nav-btn {
  --icon-width: 1.25rem;
  width: 100%;
  justify-content: flex-start;
  padding-left: 0.75rem;
  border-radius: 6px;
  font-size: $base-font-size;
  font-weight: normal;
  text-align: left;
  text-transform: none;
  color: var(--text);
  background-color: transparent;
  box-shadow: none;

  &:hover {
    background-color: var(--btn-flat-bg-hover);
  }

  &.active {
    background-color: var(--btn-bg-hover);
  }

  .material-icons {
    width: var(--icon-width);
    font-size: 1.1rem;
  }

  .no-icon {
    padding-left: calc(var(--icon-width) + var(--btn-gap));
  }
}

.content {
  flex-grow: 1;
  min-width: 0;
  // Stops the slide-in from adding a horizontal scrollbar
  overflow-x: clip;
}
</style>
