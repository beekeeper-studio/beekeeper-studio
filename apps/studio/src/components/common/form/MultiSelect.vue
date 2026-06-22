<template>
  <div
    class="multi-select"
    :class="{ open: isOpen }"
    v-bind="$attrs"
    v-on="filteredListeners"
  >
    <input
      ref="input"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-controls="listboxId"
      :aria-activedescendant="
        isOpen && activeIndex >= 0 ? optionId(activeIndex) : null
      "
      autocomplete="off"
      spellcheck="false"
      :placeholder="placeholder"
      :value="value"
      @click="open"
      @input="onInput"
      @blur="close"
      @keydown.down.prevent="isOpen ? move(1) : open()"
      @keydown.up.prevent="isOpen ? move(-1) : open()"
      @keydown.enter.prevent="isOpen && activeOption && addOption(activeOption)"
      @keydown.esc.prevent="close"
      @keydown.tab="close"
    />

    <portal to="menus">
      <ul
        v-show="isOpen"
        :id="listboxId"
        ref="listbox"
        class="panel"
        role="listbox"
        :style="panelStyle"
      >
        <li
          v-for="(option, index) in filteredSuggestions"
          :id="optionId(index)"
          :key="index"
          class="option"
          :class="{ active: index === activeIndex }"
          role="option"
          :aria-selected="index === activeIndex ? 'true' : 'false'"
          @mousedown.prevent="addOption(option)"
        >
          <slot name="option" :option="option" :index="index">
            <span class="label">{{ optionText(option) }}</span>
            <span class="hint" v-if="optionHint(option)">{{
              optionHint(option)
            }}</span>
          </slot>
        </li>
        <li
          v-if="filteredSuggestions.length === 0"
          class="empty"
          role="presentation"
        >
          <slot name="empty-state">No results</slot>
        </li>
      </ul>
    </portal>
    <div v-if="selectedOptions.length" class="selected-options">
      <span
        v-for="(option, index) in selectedOptions"
        :key="index"
        class="selected-option"
      >
        <slot name="selected-option" :option="option" :index="index">
          {{ optionText(option) }}
        </slot>
        <button
          type="button"
          class="selected-option-remove"
          aria-label="Remove"
          @mousedown.prevent="removeOption(option)"
        >
          <i class="material-icons">close</i>
        </button>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Portal } from "portal-vue";

type Option = unknown;

export default Vue.extend({
  name: "MultiSelect",
  components: { Portal },
  props: {
    value: {
      type: String,
      default: "",
    },
    /** An array of strings or objects. For objects, use the the option slot. */
    suggestions: {
      type: Array as PropType<Option[]>,
      default: () => [],
    },
    selectedOptions: {
      type: Array as PropType<Option[]>,
      default: () => [],
    },
    /** Object key used to render the option text. Ignored for string suggestions. */
    displayKey: String,
    /** Object key used for filtering. Ignored for string suggestions. */
    filterKey: String,
    /** Object key used for the hint text. Ignored for string suggestions. */
    hintKey: String,
    placeholder: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      isOpen: false,
      activeIndex: -1,
      panelPosition: { top: 0, left: 0, width: 0 },
    };
  },
  computed: {
    filteredListeners() {
      const { input, ...rest } = this.$listeners;
      return rest;
    },
    listboxId() {
      return `multi-select-${this._uid}-listbox`;
    },
    activeOption() {
      return this.filteredSuggestions[this.activeIndex];
    },
    filteredSuggestions() {
      const query = this.value.trim().toLowerCase();
      const suggestions = this.suggestions.filter(
        (option) => !this.selectedOptions.includes(option)
      );
      if (!query) {
        return suggestions;
      }
      return suggestions.filter((option) =>
        this.filterText(option).toLowerCase().includes(query)
      );
    },
    panelStyle() {
      return {
        position: "fixed",
        top: `${this.panelPosition.top}px`,
        left: `${this.panelPosition.left}px`,
        width: `${this.panelPosition.width}px`,
      };
    },
  },
  watch: {
    isOpen(open) {
      if (open) {
        document.addEventListener("mousedown", this.maybeClose);
        this.$nextTick(this.updatePosition);
        window.addEventListener("scroll", this.updatePosition, true);
        window.addEventListener("resize", this.updatePosition);
      } else {
        document.removeEventListener("mousedown", this.maybeClose);
        window.removeEventListener("scroll", this.updatePosition, true);
        window.removeEventListener("resize", this.updatePosition);
      }
    },
  },
  methods: {
    optionId(index: number) {
      return `multi-select-${this._uid}-opt-${index}`;
    },
    open() {
      if (this.disabled || this.isOpen) {
        return;
      }
      this.isOpen = true;
      this.activeIndex = -1;
      this.$emit("open");
    },
    close() {
      this.isOpen = false;
      this.activeIndex = -1;
    },
    onInput(e: InputEvent) {
      this.$emit("input", (e.target as HTMLInputElement).value);
      this.isOpen = true;
      this.activeIndex = -1;
    },
    optionText(option: Option) {
      if (option !== null && typeof option === "object") {
        return this.displayKey ? String(option[this.displayKey]) : "";
      }
      return String(option);
    },
    filterText(option: Option) {
      if (option !== null && typeof option === "object") {
        return this.filterKey ? String(option[this.filterKey]) : "";
      }
      return String(option);
    },
    optionHint(option: Option) {
      if (option !== null && typeof option === "object") {
        return this.hintKey ? String(option[this.hintKey]) : "";
      }
      return "";
    },
    async move(delta: -1 | 1) {
      const count = this.filteredSuggestions.length;
      if (count === 0) return;
      if (this.activeIndex === -1) {
        this.activeIndex = delta > 0 ? 0 : count - 1;
      } else {
        this.activeIndex = (this.activeIndex + delta + count) % count;
      }
      await this.$nextTick();
      this.scrollActiveIntoView();
    },
    addOption(option: Option) {
      this.$emit("item-add", option);
      this.close();
    },
    removeOption(option: Option) {
      this.$emit("item-remove", option);
    },
    scrollActiveIntoView() {
      const list = this.$refs.listbox;
      const el = list && list.children[this.activeIndex];
      if (el) el.scrollIntoView({ block: "nearest" });
    },
    maybeClose(e: MouseEvent) {
      const list = this.$refs.listbox as HTMLElement | undefined;
      const inEl = this.$el.contains(e.target as Node);
      const inList = list && list.contains(e.target as Node);
      if (!inEl && !inList) {
        this.close();
      }
    },
    updatePosition() {
      const rect = this.$el.getBoundingClientRect();
      this.panelPosition = {
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      };
    },
  },
  beforeDestroy() {
    document.removeEventListener("mousedown", this.maybeClose);
    window.removeEventListener("scroll", this.updatePosition, true);
    window.removeEventListener("resize", this.updatePosition);
  },
});
</script>

<style scoped>
.multi-select {
  position: relative;
}

.selected-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.25rem;
}

.selected-option {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  padding: 1px 2px 1px 0.5rem;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text-dark);
  background: color-mix(in srgb, var(--theme-base) 12%, transparent);
  border-radius: 4px;
  user-select: none;
}

.selected-option-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;

  &:hover {
    color: var(--text-dark);
  }

  .material-icons {
    font-size: 14px;
  }
}

.panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  margin: 0;
  padding: 0.3rem 0;
  list-style: none;
  overflow-y: auto;
  font-size: 0.85rem;
  background: var(--menu-bg);
  border-radius: 6px;
  box-shadow: var(--menu-shadow);
}

.option {
  display: flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.8rem;
  font-size: 0.9rem;
  color: var(--text-dark);
  cursor: pointer;
  user-select: none;

  &:hover,
  &.active {
    background: color-mix(in srgb, var(--theme-base) 5%, transparent);
  }
}

.hint {
  margin-left: auto;
  max-width: 50%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text-light);
}

.empty {
  padding: 0 0.8rem;
  min-height: 28px;
  display: flex;
  align-items: center;
  color: var(--text-light);
  user-select: none;
}
</style>
