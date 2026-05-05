<template>
  <portal to="modals">
    <modal
      :name="modalName"
      :class="['vue-dialog', 'beekeeper-modal', 'keyboard-shortcuts-modal']"
    >
      <div v-kbd-trap="true">
        <div class="dialog-content">
          <div class="dialog-c-title">Keyboard Shortcuts</div>
          <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
            <i class="material-icons">clear</i>
          </a>
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
                      <span v-for="(key, keyIdx) in keybinding" :key="keyIdx">{{
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
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import uFuzzy from "@leeoniya/ufuzzy";
import { AppEvent } from "@/common/AppEvent";
import { escapeHtml } from "@shared/lib/tabulator";
import type { KeybindingSection } from "@/types";

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
    close() {
      this.$modal.hide(this.modalName);
    },
  },
});
</script>

<style scoped>
.dialog-content {
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
  overflow-y: auto;
  padding-bottom: 1rem;
  padding-right: 0.5rem;
  margin-right: -0.8rem;
  height: 100%;
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
  /* NOTE: This was probably ok when we still use Roboto as a font. */
  /* Now we use system font. So at least in mac, this isn't good. */
  /* letter-spacing: 0.05rem; */
  text-transform: uppercase;
  font-weight: bold;
  text-transform: uppercase;
  color: var(--text-dark);
  background-color: hsl(from var(--theme-bg) h s calc(l + 1));
  border-bottom: 1px solid var(--border-color);
}

.kbd-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  padding-block: 0.65rem;
}

.kbd-label {
  color: rgb(from var(--theme-base) r g b / 77%);
}

.kbd-label ::v-deep strong {
  color: var(--text-dark);
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

  > span {
    display: inline-block;
    padding: 0 0.35rem;
    border-radius: 4px;
    line-height: 1.6;
    font-size: 0.85rem;
    font-weight: normal;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    background: rgb(from var(--theme-base) r g b / 5%);
    box-shadow: inset 0 0 0 1px rgb(from var(--theme-base) r g b / 5%);
    color: var(--text);
  }
}
</style>
