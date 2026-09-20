<template>
  <base-modal :name="modalName">
    <template #title>
      Keyboard Shortcuts
    </template>
    <div class="kbd-body">
      <div class="search-wrapper">
        <input
          type="text"
          placeholder="Search shortcuts"
          v-model="searchQuery"
        >
        <span
          v-show="searchQuery"
          class="clear"
          @click="searchQuery = ''"
        >
          <i class="material-icons">cancel</i>
        </span>
      </div>
      <div class="kbd-content">
        <div
          v-for="section in filteredSections"
          :key="section.sectionKey"
          class="kbd-section"
        >
          <h3 class="kbd-section-title">
            {{ section.label }}
          </h3>
          <div class="kbd-list">
            <div
              v-for="action in section.actions"
              :key="action.key"
              class="kbd-item"
            >
              <div
                v-if="action.highlight"
                class="kbd-label"
                v-html="action.highlight"
              />
              <div v-else class="kbd-label">
                {{ action.label }}
              </div>
              <div class="kbd-keys">
                <div
                  v-for="(keybinding, kbIdx) in action.keybindings"
                  :key="kbIdx"
                  class="kbd-keybinding"
                >
                  <span v-for="(key, keyIdx) in keybinding" :key="keyIdx" class="kbd">{{
                    key
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="!filteredSections.length"
          class="no-matching-results"
        >
          No matching results
        </div>
      </div>
    </div>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import uFuzzy from "@leeoniya/ufuzzy";
import { AppEvent } from "@/common/AppEvent";
import { escapeHtml } from "@shared/lib/tabulator";
import type { KeybindingSection } from "@/types";
import BaseModal from "@/components/common/modals/BaseModal.vue";

type SectionAction = KeybindingSection["actions"][number];
type FilteredAction = SectionAction & { highlight?: string };
type FilteredSection = Omit<KeybindingSection, "actions"> & {
  actions: FilteredAction[];
};

const uf = new uFuzzy({
  intraMode: 0,
  intraIns: Infinity,
});

export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "keyboard-shortcuts-modal",
      searchQuery: "",
    };
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openKeyboardShortcuts, handler: this.open }];
    },
    sections(): KeybindingSection[] {
      return this.$bksConfigUI.getKeybindingSections();
    },
    filteredSections(): FilteredSection[] {
      const query = this.searchQuery.trim();
      if (!query) return this.sections;

      const flat: { sectionIdx: number; action: SectionAction }[] = [];
      this.sections.forEach((section, sectionIdx) => {
        section.actions.forEach((action) => {
          flat.push({ sectionIdx, action });
        });
      });

      const labels = flat.map((f) => f.action.label);
      const [idxs, info, order] = uf.search(labels, query, 0, Infinity);
      if (!idxs || !info || !order) return [];

      const bySection = new Map<number, FilteredAction[]>();
      for (let i = 0; i < order.length; i++) {
        const infoIdx = order[i];
        const itemIdx = idxs[infoIdx];
        const entry = flat[itemIdx];

        const highlight = uFuzzy.highlight(
          labels[info.idx[infoIdx]],
          info.ranges[infoIdx],
          (part, matched) =>
            matched
              ? `<strong>${escapeHtml(part) ?? ""}</strong>`
              : escapeHtml(part) ?? ""
        );

        if (!bySection.has(entry.sectionIdx)) {
          bySection.set(entry.sectionIdx, []);
        }
        bySection.get(entry.sectionIdx)!.push({ ...entry.action, highlight });
      }

      const result: FilteredSection[] = [];
      this.sections.forEach((section, sectionIdx) => {
        const actions = bySection.get(sectionIdx);
        if (actions && actions.length) {
          result.push({ ...section, actions });
        }
      });
      return result;
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    open() {
      this.searchQuery = "";
      this.$modal.show(this.modalName);
    },
  },
});
</script>

<style scoped>
.kbd-body {
  height: 70vh;
  display: flex;
  flex-direction: column;
}

.search-wrapper {
  position: relative;
  margin-bottom: 0.25rem;
  margin-right: 0.5rem;

  input {
    padding-right: 26px !important;
  }

  .clear {
    position: absolute;
    right: 0;
    top: 56%;
    transform: translate(0, -50%);
    opacity: 0.5;
    outline: none;
    border: 0;
    padding: 0;
    cursor: pointer;

    i {
      font-size: 16px;
      width: 26px;
    }
  }
}

.no-matching-results {
  text-align: center;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.kbd-content {
  padding-bottom: 1rem;
}

.kbd-section:not(:first-child) {
  margin-top: 1.25rem;
}

.kbd-section-title {
  position: sticky;
  top: 0;
  margin: 0;
  padding-block: 0.75rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  font-weight: bold;
  text-transform: uppercase;
  color: var(--text-contrast);
}

.kbd-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  padding-block: 0.65rem;
}

.kbd-label {
  color: var(--text);
}

.kbd-label ::v-deep strong {
  color: var(--text-contrast);
  font-weight: bold;
}

.kbd-keys {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.kbd-keybinding {
  display: flex;
  gap: 0.28rem;
}
</style>
