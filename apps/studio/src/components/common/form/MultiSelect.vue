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
      :id="inputId"
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
            <span
              v-if="optionHighlight(index)"
              class="label"
              v-html="optionHighlight(index)"
            ></span>
            <span v-else class="label">{{ optionText(option) }}</span>
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
import uFuzzy from "@leeoniya/ufuzzy";
import { escapeHtml } from "@/shared/lib/tabulator";

type Option = unknown;

const uf = new uFuzzy({
  intraMode: 0,
  intraIns: Infinity,
});

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
    /** Object key used for both display and filtering. Ignored for string suggestions. */
    optionLabel: String,
    placeholder: {
      type: String,
      default: "",
    },
    inputId: String,
    /** Focuses the input whenever this value changes. */
    focusTrigger: null,
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
    searchResult(): { options: Option[]; highlights: string[] } {
      const suggestions = this.suggestions.filter(
        (option) => !this.selectedOptions.includes(option)
      );
      const query = this.value.trim();
      if (!query) {
        return { options: suggestions, highlights: [] };
      }
      const haystack = suggestions.map((option) => this.optionText(option));
      const [idxs, info, order] = uf.search(haystack, query, 0, Infinity);
      if (!idxs || !order || !info) {
        return { options: [], highlights: [] };
      }
      const options: Option[] = [];
      const highlights: string[] = [];
      for (const infoIdx of order) {
        options.push(suggestions[idxs[infoIdx]]);
        highlights.push(
          uFuzzy.highlight(
            haystack[info.idx[infoIdx]],
            info.ranges[infoIdx],
            (part, matched) =>
              matched
                ? `<strong>${escapeHtml(part) ?? ""}</strong>`
                : escapeHtml(part) ?? ""
          )
        );
      }
      return { options, highlights };
    },
    filteredSuggestions(): Option[] {
      return this.searchResult.options;
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
    focusTrigger() {
      this.$nextTick(() => {
        (this.$refs.input as HTMLInputElement).focus();
      });
    },
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
    optionHighlight(index: number) {
      return this.searchResult.highlights[index];
    },
    optionText(option: Option) {
      if (option !== null && typeof option === "object") {
        return this.optionLabel ? String(option[this.optionLabel]) : "";
      }
      return String(option);
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

.option .label ::v-deep(strong) {
  font-weight: 700;
  color: var(--theme-base);
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
